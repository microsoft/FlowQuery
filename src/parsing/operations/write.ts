import Database from "../../graph/database";
import Node from "../../graph/node";
import NodeReference from "../../graph/node_reference";
import Pattern from "../../graph/pattern";
import PatternExpression from "../../graph/pattern_expression";
import Relationship from "../../graph/relationship";
import type SourceContext from "../../graph/source_context";
import { QueryCancelledError, SourceError } from "../../graph/source_provider";
import {
    WRITE_CONTRACT_VERSION,
    WriteBackend,
    WriteChange,
    WriteResult,
    WriteSet,
} from "../../graph/write_set";
import ASTNode from "../ast_node";
import Expression from "../expressions/expression";
import SubqueryExpression from "../expressions/subquery_expression";
import FunctionFactory from "../functions/function_factory";
import Call from "./call";
import { definitionBackend } from "./definition_backend";
import Load from "./load";
import Match from "./match";
import Operation from "./operation";

/** A label or relationship type a write clause changes. */
export type WriteTarget =
    | { kind: "node"; label: string | null }
    | {
          kind: "relationship";
          type: string | null;
          sourceLabel: string | null;
          targetLabel: string | null;
      };

/** One item of `SET`, `REMOVE` or `ON CREATE` / `ON MATCH SET`. */
export type SetItem =
    | { kind: "property"; element: Node | Relationship; property: string; expression: Expression }
    | { kind: "merge"; element: Node | Relationship; expression: Expression }
    | { kind: "replace"; element: Node | Relationship; expression: Expression }
    | { kind: "addLabels"; element: Node; labels: string[] }
    | { kind: "removeProperty"; element: Node | Relationship; property: string }
    | { kind: "removeLabels"; element: Node; labels: string[] };

function itemExpressions(items: SetItem[]): ASTNode[] {
    const out: ASTNode[] = [];
    for (const item of items) {
        if (item.kind === "property" || item.kind === "merge" || item.kind === "replace") {
            out.push(item.expression);
        }
    }
    return out;
}

/** Static label of a node pattern element (following references). */
export function labelOf(node: Node | null): string | null {
    if (node === null) return null;
    if (node.label !== null) return node.label;
    if (node instanceof NodeReference && node.reference instanceof Node) {
        return labelOf(node.reference);
    }
    return null;
}

function nodeTargetOf(node: Node): WriteTarget {
    return { kind: "node", label: labelOf(node) };
}

function relationshipTargetOf(rel: Relationship): WriteTarget {
    const [start, end] = endpoints(rel);
    return {
        kind: "relationship",
        type: rel.type,
        sourceLabel: labelOf(start),
        targetLabel: labelOf(end),
    };
}

/** Stored (left, right) endpoints of a pattern relationship. */
function endpoints(rel: Relationship): [Node | null, Node | null] {
    return rel.direction === "left" ? [rel.target, rel.source] : [rel.source, rel.target];
}

function evaluate(properties: Map<string, Expression>): Record<string, any> {
    const out: Record<string, any> = {};
    for (const [key, expression] of properties) out[key] = expression.value();
    return out;
}

/** Current value of a node variable: the bound record, following references. */
function nodeValue(node: Node): Record<string, any> | null {
    if (node instanceof NodeReference) {
        return (node.reference?.value() as Record<string, any> | null) ?? null;
    }
    return node.value();
}

/** Identity of the relationship bound to `rel` in the current row. */
function relationshipTarget(rel: Relationship): any {
    if (rel.createdRecord !== null) return rel.createdRecord.id;
    const record = rel.currentRecord(0);
    if (record === null || record === undefined) return null;
    if (record.id !== undefined && record.id !== null) return record.id;
    return { left_id: record.left_id, right_id: record.right_id };
}

/** Rebind a node variable to a copy of its value with `properties` applied. */
function updateNodeValue(node: Node, properties: Record<string, any>): void {
    const value = nodeValue(node);
    if (value === null) return;
    const next: Record<string, any> = { ...value };
    for (const [k, v] of Object.entries(properties)) {
        if (v === null || v === undefined) delete next[k];
        else next[k] = v;
    }
    node.setValue(next as any);
}

function withoutNulls(map: any): Record<string, any> {
    const out: Record<string, any> = {};
    if (map === null || typeof map !== "object") return out;
    for (const [k, v] of Object.entries(map)) {
        if (v !== null && v !== undefined) out[k] = v;
    }
    return out;
}

function replaceNodeValue(node: Node, properties: Record<string, any>): void {
    const value = nodeValue(node);
    if (value === null) return;
    node.setValue({ id: value.id, ...withoutNulls(properties) } as any);
}

function replaceRelationshipValue(rel: Relationship, properties: Record<string, any>): void {
    const value = rel.value();
    if (value === null || Array.isArray(value)) return;
    const props = withoutNulls(properties);
    const next: any = {
        ...props,
        type: value.type,
        startNode: value.startNode,
        endNode: value.endNode,
        properties: { ...props },
    };
    if (value.id !== undefined) next.id = value.id;
    rel.overrideValue(next);
}

function updateRelationshipValue(rel: Relationship, properties: Record<string, any>): void {
    const value = rel.value();
    if (value === null || Array.isArray(value)) return;
    const next: any = { ...value, properties: { ...value.properties } };
    for (const [k, v] of Object.entries(properties)) {
        if (v === null || v === undefined) {
            delete next[k];
            delete next.properties[k];
        } else {
            next[k] = v;
            next.properties[k] = v;
        }
    }
    rel.overrideValue(next);
}

/**
 * Base class of the declarative write clauses.  Each run records changes
 * in the query's {@link WriteSet} and continues with the same row.
 */
export abstract class WriteOperation extends Operation {
    private _context: SourceContext | null = null;

    /** @internal Query context assigned by the runner. */
    public set sourceContext(ctx: SourceContext | null) {
        this._context = ctx;
    }
    public get sourceContext(): SourceContext | null {
        return this._context;
    }
    /** Labels and relationship types this clause writes to. */
    public abstract get targets(): WriteTarget[];
    /** @internal Patterns and expressions evaluated by this clause (held off-tree). */
    public get evaluated(): ASTNode[] {
        return [];
    }
    protected abstract apply(writes: WriteSet): void;

    protected get writes(): WriteSet {
        if (this._context === null) {
            throw new Error("Write clauses are only allowed in top-level queries");
        }
        this._context.writes ??= new WriteSet();
        return this._context.writes;
    }
    public async run(): Promise<void> {
        this._context?.throwIfCancelled();
        const writes = this.writes;
        this.apply(writes);
        if (writes.transactional && writes.perRow) {
            await flushWrites(this._context!, writes);
        }
        await this.next?.run();
    }
    public get results(): Record<string, any>[] {
        return [];
    }

    /** Write clauses of a statement's operation chain. */
    public static collect(first: Operation | null): WriteOperation[] {
        const out: WriteOperation[] = [];
        for (let op = first; op !== null; op = op.next) {
            if (op instanceof WriteOperation) out.push(op);
        }
        return out;
    }

    protected applyItems(items: SetItem[], writes: WriteSet): void {
        for (const item of items) {
            const element = item.element;
            if (element instanceof Relationship) {
                const target = relationshipTarget(element);
                if (target === null) continue;
                if (item.kind === "replace") {
                    const properties = { ...(item.expression.value() ?? {}) };
                    writes.add({
                        op: "replaceProperties",
                        target,
                        type: element.type,
                        properties,
                    });
                    replaceRelationshipValue(element, properties);
                    continue;
                }
                let properties: Record<string, any>;
                if (item.kind === "property") {
                    properties = { [item.property]: item.expression.value() };
                } else if (item.kind === "merge") {
                    properties = { ...(item.expression.value() ?? {}) };
                } else if (item.kind === "removeProperty") {
                    properties = { [item.property]: null };
                } else {
                    throw new Error("Relationships have no labels");
                }
                writes.add({ op: "setProperties", target, type: element.type, properties });
                updateRelationshipValue(element, properties);
                continue;
            }
            const value = nodeValue(element);
            if (value === null) continue;
            const label = labelOf(element);
            switch (item.kind) {
                case "replace": {
                    const properties = { ...(item.expression.value() ?? {}) };
                    writes.add({ op: "replaceProperties", target: value.id, label, properties });
                    replaceNodeValue(element, properties);
                    break;
                }
                case "property":
                case "merge":
                case "removeProperty": {
                    const properties =
                        item.kind === "property"
                            ? { [item.property]: item.expression.value() }
                            : item.kind === "merge"
                              ? { ...(item.expression.value() ?? {}) }
                              : { [item.property]: null };
                    writes.add({ op: "setProperties", target: value.id, label, properties });
                    updateNodeValue(element, properties);
                    break;
                }
                case "addLabels":
                case "removeLabels":
                    writes.add({
                        op: item.kind,
                        target: value.id,
                        label,
                        labels: [...item.labels],
                    });
                    break;
            }
        }
    }
}

/** `CREATE (n:Label {...})`, `CREATE (a)-[:TYPE {...}]->(b)`, comma-separated. */
export class CreateWrite extends WriteOperation {
    constructor(private readonly _patterns: Pattern[]) {
        super();
    }
    public get patterns(): Pattern[] {
        return this._patterns;
    }
    public get evaluated(): ASTNode[] {
        return this._patterns;
    }
    public get targets(): WriteTarget[] {
        const out: WriteTarget[] = [];
        for (const pattern of this._patterns) {
            for (const element of pattern.chain) {
                if (element instanceof Relationship) out.push(relationshipTargetOf(element));
                else if (!(element instanceof NodeReference)) out.push(nodeTargetOf(element));
            }
        }
        return out;
    }
    protected apply(writes: WriteSet): void {
        for (const pattern of this._patterns) {
            for (const element of pattern.chain) {
                if (element instanceof Node && !(element instanceof NodeReference)) {
                    const ref = writes.ref();
                    const properties = evaluate(element.properties);
                    writes.add({
                        op: "createNode",
                        ref,
                        labels: [...element.labels],
                        properties,
                    });
                    element.setValue({ id: ref, ...properties } as any);
                    bindNode(writes, element, ref);
                }
            }
            for (const element of pattern.chain) {
                if (element instanceof Relationship) {
                    const [left, right] = endpoints(element);
                    const start = left !== null ? nodeValue(left) : null;
                    const end = right !== null ? nodeValue(right) : null;
                    if (start === null || end === null) {
                        throw new Error(`Cannot create [:${element.type}]: an endpoint is null`);
                    }
                    const ref = writes.ref();
                    const properties = evaluate(element.properties);
                    writes.add({
                        op: "createRelationship",
                        ref,
                        type: element.type,
                        start: start.id,
                        end: end.id,
                        properties,
                    });
                    bindRelationship(writes, element, ref, start, end, properties);
                }
            }
        }
    }
}

/** Swap a node variable's temporary id for the final one once known. */
function bindNode(writes: WriteSet, node: Node, ref: string): void {
    writes.bind(ref, (id) => {
        const value = node.value();
        if (value !== null && value.id === ref) node.setValue({ ...value, id } as any);
    });
}

function bindRelationship(
    writes: WriteSet,
    rel: Relationship,
    ref: string,
    start: Record<string, any>,
    end: Record<string, any>,
    properties: Record<string, any>
): void {
    rel.createdRecord = { id: ref, left_id: start.id, right_id: end.id, ...properties };
    rel.overrideValue({
        ...properties,
        id: ref,
        type: rel.type!,
        startNode: start,
        endNode: end,
        properties: { ...properties },
    });
    writes.bind(ref, (id) => {
        if (rel.createdRecord !== null && rel.createdRecord.id === ref) {
            rel.createdRecord = { ...rel.createdRecord, id };
        }
        const value = rel.value();
        if (value !== null && !Array.isArray(value) && value.id === ref) {
            rel.overrideValue({ ...value, id });
        }
    });
}

/**
 * `MERGE (n:Label {key...})` or `MERGE (a)-[r:TYPE {key...}]->(b)` with
 * optional `ON CREATE SET` / `ON MATCH SET`.  The backend matches on the
 * key, creates when missing and applies `onCreate` / `onMatch` inside its
 * own transaction.
 */
export class MergeWrite extends WriteOperation {
    constructor(
        private readonly _pattern: Pattern,
        private readonly _onCreate: SetItem[],
        private readonly _onMatch: SetItem[]
    ) {
        super();
    }
    public get pattern(): Pattern {
        return this._pattern;
    }
    public get evaluated(): ASTNode[] {
        return [
            this._pattern,
            ...itemExpressions(this._onCreate),
            ...itemExpressions(this._onMatch),
        ];
    }
    private get relationship(): Relationship | null {
        const rel = this._pattern.chain.find((e) => e instanceof Relationship);
        return (rel as Relationship | undefined) ?? null;
    }
    public get targets(): WriteTarget[] {
        const rel = this.relationship;
        return rel !== null
            ? [relationshipTargetOf(rel)]
            : [nodeTargetOf(this._pattern.chain[0] as Node)];
    }
    private static collectItems(items: SetItem[]): Record<string, any> {
        const out: Record<string, any> = {};
        for (const item of items) {
            if (item.kind === "property") out[item.property] = item.expression.value();
            else if (item.kind === "merge") Object.assign(out, item.expression.value() ?? {});
        }
        return out;
    }
    protected apply(writes: WriteSet): void {
        const onCreate = MergeWrite.collectItems(this._onCreate);
        const onMatch = MergeWrite.collectItems(this._onMatch);
        const rel = this.relationship;
        const ref = writes.ref();
        if (rel === null) {
            const node = this._pattern.chain[0] as Node;
            const key = evaluate(node.properties);
            writes.add({ op: "mergeNode", ref, label: labelOf(node), key, onCreate, onMatch });
            node.setValue({ id: ref, ...key } as any);
            bindNode(writes, node, ref);
            return;
        }
        const [left, right] = endpoints(rel);
        const start = left !== null ? nodeValue(left) : null;
        const end = right !== null ? nodeValue(right) : null;
        if (start === null || end === null) {
            throw new Error(`Cannot merge [:${rel.type}]: an endpoint is null`);
        }
        const key = evaluate(rel.properties);
        writes.add({
            op: "mergeRelationship",
            ref,
            type: rel.type,
            start: start.id,
            end: end.id,
            key,
            onCreate,
            onMatch,
        });
        bindRelationship(writes, rel, ref, start, end, key);
    }
}

/** `SET n.prop = v`, `SET n += {...}`, `SET n:Label`. */
export class SetWrite extends WriteOperation {
    constructor(private readonly _items: SetItem[]) {
        super();
    }
    public get items(): SetItem[] {
        return this._items;
    }
    public get evaluated(): ASTNode[] {
        return itemExpressions(this._items);
    }
    public get targets(): WriteTarget[] {
        return this._items.map((item) =>
            item.element instanceof Relationship
                ? relationshipTargetOf(item.element)
                : nodeTargetOf(item.element)
        );
    }
    protected apply(writes: WriteSet): void {
        this.applyItems(this._items, writes);
    }
}

/** `REMOVE n.prop`, `REMOVE n:Label`. */
export class RemoveWrite extends SetWrite {}

/** `DELETE x, y` / `DETACH DELETE n`. */
export class DeleteWrite extends WriteOperation {
    constructor(
        private readonly _elements: (Node | Relationship)[],
        private readonly _detach: boolean
    ) {
        super();
    }
    public get detach(): boolean {
        return this._detach;
    }
    public get targets(): WriteTarget[] {
        return this._elements.map((e) =>
            e instanceof Relationship ? relationshipTargetOf(e) : nodeTargetOf(e)
        );
    }
    protected apply(writes: WriteSet): void {
        for (const element of this._elements) {
            if (element instanceof Relationship) {
                const target = relationshipTarget(element);
                if (target === null) continue;
                writes.add({ op: "deleteRelationship", target, type: element.type });
            } else {
                const value = nodeValue(element);
                if (value === null) continue;
                writes.add({
                    op: "deleteNode",
                    target: value.id,
                    label: labelOf(element),
                    detach: this._detach,
                });
            }
        }
    }
}

function describe(target: WriteTarget): string {
    return target.kind === "node"
        ? `(:${target.label ?? ""})`
        : `(:${target.sourceLabel ?? ""})-[:${target.type ?? ""}]->(:${target.targetLabel ?? ""})`;
}

/**
 * Resolve the backend function a write target is applied through.  The
 * target must have a statement-backed `CREATE VIRTUAL` definition whose
 * effective capabilities declare `writes: true` and whose body loads
 * from `fn($request)`.
 */
export function resolveWriteBackend(target: WriteTarget): {
    backend: WriteBackend;
    transactions: boolean;
} {
    const db = Database.getInstance();
    const name = describe(target);
    let physical: any = undefined;
    if (target.kind === "node") {
        if (target.label === null) {
            throw new Error("Cannot write to a node without a label");
        }
        physical = db.nodes.get(target.label);
    } else {
        if (target.type === null) {
            throw new Error("Cannot write to a relationship without a type");
        }
        const byEndpoints = db.relationships.get(target.type);
        if (byEndpoints !== undefined) {
            physical = byEndpoints.get(`${target.sourceLabel ?? ""}:${target.targetLabel ?? ""}`);
            if (physical === undefined && byEndpoints.size === 1) {
                physical = byEndpoints.values().next().value;
            }
        }
    }
    if (physical === undefined || physical === null) {
        throw new Error(`Cannot write to ${name}: it has no CREATE VIRTUAL definition`);
    }
    if (
        physical.statement === null ||
        physical.provider === null ||
        physical.provider.capabilities?.writes !== true
    ) {
        throw new Error(
            `Cannot write to ${name}: its definition does not declare the writes capability`
        );
    }
    const backend = definitionBackend(physical.statement);
    if (backend === null) {
        throw new Error(
            `Cannot write to ${name}: its definition does not load from a backend function called with $request`
        );
    }
    const args = backend.func
        .getChildren()
        .map((child, i) => (i === backend.requestIndex ? null : child.value()));
    return {
        backend: {
            name: backend.name,
            functionClass: backend.functionClass,
            requestIndex: backend.requestIndex,
            args,
        },
        transactions: physical.provider.capabilities?.transactions === true,
    };
}

/** True when a clause after the statement's first write clause reads data. */
export function readsAfterWrites(first: Operation | null): boolean {
    let written = false;
    for (let op = first; op !== null; op = op.next) {
        if (op instanceof WriteOperation) {
            written = true;
            continue;
        }
        if (!written) continue;
        if (op instanceof Match || op instanceof Load || op instanceof Call) return true;
        if (containsRead(op)) return true;
    }
    return false;
}

function containsRead(node: ASTNode): boolean {
    if (node instanceof SubqueryExpression || node instanceof PatternExpression) return true;
    return node.getChildren().some(containsRead);
}

/**
 * Check every target of a statement's write clauses before it runs, pin
 * the query to a single backend function and decide when changes are
 * sent (see {@link WriteSet}).
 */
export function prepareWrites(first: Operation, ctx: SourceContext): void {
    const operations = WriteOperation.collect(first);
    if (operations.length === 0) return;
    const writes = (ctx.writes ??= new WriteSet());
    for (const op of operations) {
        for (const target of op.targets) {
            const { backend, transactions } = resolveWriteBackend(target);
            const current = writes.backend;
            if (current === null) {
                writes.backend = backend;
            } else if (current.functionClass !== backend.functionClass) {
                throw new Error(
                    `A query can only write through one backend function (${current.name} and ${backend.name})`
                );
            }
            writes.transactional &&= transactions;
        }
    }
    writes.perRow = writes.transactional && readsAfterWrites(first);
}

/** Call the backend function once with `request` and return its first item. */
async function callBackend(
    ctx: SourceContext,
    backend: WriteBackend,
    request: Record<string, any>,
    afterCancel: boolean = false
): Promise<any> {
    const fn = FunctionFactory.createAsync(backend.name);
    fn.sourceContext = ctx;
    await fn.prepareContext(afterCancel);
    const args = [...backend.args];
    args[backend.requestIndex] = { version: WRITE_CONTRACT_VERSION, ...request };
    let response: any = undefined;
    try {
        for await (const item of fn.generate(...args)) {
            response = item;
            break;
        }
    } catch (e) {
        if (e instanceof QueryCancelledError) throw e;
        const message = e instanceof Error ? e.message : String(e);
        const what =
            request.operation === "write"
                ? "Write"
                : `${request.operation[0].toUpperCase()}${request.operation.slice(1)}`;
        throw new SourceError(
            `${what} through ${backend.name} failed: ${message}`,
            backend.name,
            request.operation,
            e
        );
    }
    if (response !== undefined && (response === null || typeof response !== "object")) {
        throw new SourceError(
            `Write through ${backend.name} returned an invalid response`,
            backend.name,
            request.operation
        );
    }
    return response ?? {};
}

/**
 * Send the changes not sent yet.  In a transactional query they are
 * applied inside the backend's open transaction, so the query's later
 * reads see them; the query-scoped read cache is dropped.
 */
export async function flushWrites(ctx: SourceContext, writes: WriteSet): Promise<void> {
    if (writes.pending === 0 || writes.backend === null) return;
    ctx.throwIfCancelled();
    const changes = writes.takePending();
    writes.absorb(await callBackend(ctx, writes.backend, { operation: "write", changes }));
    writes.sent = true;
    ctx.clearCache();
}

/**
 * Finish the query's writes: send the remaining changes (all of them, in
 * one call, for non-transactional backends) and commit a transactional
 * query.
 */
export async function commitWrites(ctx: SourceContext, writes: WriteSet): Promise<WriteResult> {
    ctx.throwIfCancelled();
    await flushWrites(ctx, writes);
    if (writes.transactional && writes.sent && writes.backend !== null) {
        ctx.throwIfCancelled();
        await callBackend(ctx, writes.backend, { operation: "commit" });
        writes.committed = true;
    }
    return { ids: { ...writes.ids }, stats: { ...writes.stats }, changes: writes.changes };
}

/**
 * Roll back a transactional query whose changes were already sent.
 * Failures are ignored so the query's own error is reported.
 */
export async function rollbackWrites(ctx: SourceContext, writes: WriteSet): Promise<void> {
    if (!writes.transactional || !writes.sent || writes.committed || writes.backend === null) {
        return;
    }
    try {
        await callBackend(ctx, writes.backend, { operation: "rollback" }, true);
    } catch {
        // The query already failed; its error takes precedence.
    }
}
