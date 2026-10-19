import ASTNode from "../parsing/ast_node";
import Expression from "../parsing/expressions/expression";
import {
    commonNamespace,
    endpointNamespace,
    labelsOf,
    namespaceOf,
    originMatches,
} from "./graph_records";
import NodeData, { NodeRecord } from "./node_data";
import Relationship from "./relationship";
import { NodeAccess, PushedPredicate, SourceTerms, buildTerms } from "./source_access";

class Node extends ASTNode {
    protected _identifier: string | null = null;
    protected _label: string | null = null;
    protected _labels: string[] = [];
    /** `(n:A:B)`: a match must carry every label (graphs only). */
    protected _allLabels: boolean = false;
    /** Graph named by a qualified label, `(n:hr.Person)`; `null` when unqualified. */
    protected _graph: string | null = null;
    protected _properties: Map<string, Expression> = new Map();
    protected _value: NodeRecord | null = null;

    protected _incoming: Relationship | null = null;
    protected _outgoing: Relationship | null = null;

    private _data: NodeData | null = null;
    private _access: NodeAccess | null = null;
    private _pushedPredicates: PushedPredicate[] = [];

    constructor(identifier: string | null = null, label: string | null = null) {
        super();
        this._identifier = identifier;
        this._label = label;
        if (label !== null) {
            this._labels = [label];
        }
    }
    public set identifier(identifier: string) {
        this._identifier = identifier;
    }
    public get identifier(): string | null {
        return this._identifier;
    }
    public set label(label: string) {
        this._label = label;
        this._labels = [label];
    }
    public get label(): string | null {
        return this._label;
    }
    public set labels(labels: string[]) {
        this._labels = labels;
        this._label = labels.length > 0 ? labels[0] : null;
    }
    public get labels(): string[] {
        return this._labels;
    }
    /**
     * True for `(n:A:B)` (every label required), false for a single label
     * or `(n:A|B)` (any of the labels).
     */
    public get allLabels(): boolean {
        return this._allLabels && this._labels.length > 1;
    }
    public set allLabels(value: boolean) {
        this._allLabels = value;
    }
    public get graph(): string | null {
        return this._graph;
    }
    public set graph(value: string | null) {
        this._graph = value;
    }
    public get properties(): Map<string, Expression> {
        return this._properties;
    }
    public set properties(properties: Map<string, Expression>) {
        this._properties = properties;
    }
    private _matchesProperties(hop: number = 0): boolean {
        const data: NodeData = this._data!;
        for (const [key, expression] of this._properties) {
            const record: NodeRecord = data.current(hop)!;
            if (record === null) {
                throw new Error("No current node data available");
            }
            if (!(key in record)) {
                return false;
            }
            if (record[key] !== expression.value()) {
                return false;
            }
        }
        return true;
    }
    public setProperty(key: string, value: Expression): void {
        this._properties.set(key, value);
    }
    public getProperty(key: string): Expression | null {
        return this._properties.get(key) || null;
    }
    public setValue(value: NodeRecord): void {
        this._value = value;
    }
    public value(): NodeRecord | null {
        return this._value;
    }
    public set outgoing(relationship: Relationship | null) {
        this._outgoing = relationship;
    }
    public get outgoing(): Relationship | null {
        return this._outgoing;
    }
    public set incoming(relationship: Relationship | null) {
        this._incoming = relationship;
    }
    public get incoming(): Relationship | null {
        return this._incoming;
    }
    public setData(data: NodeData | null): void {
        this._data = data;
    }
    public getData(): NodeData | null {
        return this._data;
    }
    /** @internal Provider-backed access; when set, rows are fetched on demand. */
    public setAccess(access: NodeAccess | null): void {
        this._access = access;
    }
    public get access(): NodeAccess | null {
        return this._access;
    }
    /** WHERE comparisons pushed to this node's source (set by MATCH). */
    public get pushedPredicates(): PushedPredicate[] {
        return this._pushedPredicates;
    }
    public set pushedPredicates(predicates: PushedPredicate[]) {
        this._pushedPredicates = predicates;
    }
    public sourceTerms(): SourceTerms {
        return buildTerms(this._properties, this._pushedPredicates);
    }
    /** Every label of `(n:A:B)` is carried by the row (always true otherwise). */
    public matchesLabels(record: NodeRecord): boolean {
        if (!this.allLabels) return true;
        const labels = labelsOf(record);
        return this._labels.every((label) => labels.includes(label));
    }
    /** Residual check of the pattern's own property constraints against a row. */
    public matchesRecord(record: NodeRecord): boolean {
        if (!this.matchesLabels(record)) return false;
        for (const [key, expression] of this._properties) {
            if (!(key in record)) {
                return false;
            }
            if (record[key] !== expression.value()) {
                return false;
            }
        }
        return true;
    }
    public async *next(): AsyncGenerator<void> {
        if (this._access !== null) {
            yield* this._deferredNext();
            return;
        }
        this._data?.reset();
        while (this._data?.next()) {
            this.setValue(this._data?.current()!);
            if (!this._matchesProperties() || !this.matchesLabels(this._value!)) {
                continue;
            }
            if (this._outgoing) {
                yield* this._outgoing.find(this._value!.id, 0, namespaceOf(this._value));
            } else {
                yield;
            }
        }
    }
    /**
     * Bind the node with id `id`, reached through a relationship.
     * `origin` keeps the step within the relationship's graph (see
     * {@link NodeAccess}).
     */
    public async *find(id: string, hop: number = 0, origin?: string): AsyncGenerator<void> {
        if (this._access !== null) {
            yield* this._deferredFind(id, hop, origin);
            return;
        }
        this._data?.reset();
        while (this._data?.find(id, hop)) {
            if (!originMatches(this._data?.current(hop), origin)) continue;
            this.setValue(this._data?.current(hop) as NodeRecord);
            // Always record this node as the endNode of the incoming relationship
            // match. For variable-length patterns, the same target node instance is
            // reused at every intermediate hop, so we must set the endNode of the
            // current relationship match BEFORE filtering on this node's properties.
            // Otherwise, intermediate matches keep endNode=null and pattern values
            // collapse to [startNode, endNode] when the property filter only matches
            // the final node in a *m..n traversal.
            this._incoming?.setEndNode(this);
            if (!this._matchesProperties(hop) || !this.matchesLabels(this._value!)) {
                continue;
            }
            if (this._outgoing) {
                yield* this._outgoing.find(this._value!.id, hop, namespaceOf(this._value));
            } else {
                yield;
            }
        }
    }
    private async *_deferredNext(): AsyncGenerator<void> {
        const access = this._access!;
        const { terms, args } = this.sourceTerms();
        const idTerm = terms.find((t) => t.op === "eq" && t.property === "id");
        const pages: AsyncIterable<NodeRecord[]> =
            idTerm !== undefined && idTerm.value != null && access.canLookup()
                ? (async function* () {
                      yield (await access.lookup(idTerm.value, terms, args)) as NodeRecord[];
                  })()
                : (access.scan(terms, args) as AsyncIterable<NodeRecord[]>);
        for await (const page of pages) {
            const rows = page.filter((row) => this.matchesRecord(row));
            if (this._outgoing !== null && rows.length > 1) {
                await Node.prefetchChain(this, rows);
            }
            for (const row of rows) {
                this.setValue(row);
                if (this._outgoing) {
                    yield* this._outgoing.find(row.id, 0, namespaceOf(row));
                } else {
                    yield;
                }
            }
        }
    }
    private async *_deferredFind(
        id: string,
        hop: number,
        origin: string | undefined
    ): AsyncGenerator<void> {
        const { terms, args } = this.sourceTerms();
        const rows = (await this._access!.lookup(id, terms, args, origin)) as NodeRecord[];
        for (const row of rows) {
            this.setValue(row);
            this._incoming?.setEndNode(this);
            if (!this.matchesRecord(row)) {
                continue;
            }
            if (this._outgoing) {
                yield* this._outgoing.find(row.id, hop, namespaceOf(row));
            } else {
                yield;
            }
        }
    }
    /**
     * Batch-prefetch the single-hop provider-backed chain that follows
     * `node` for a page of anchor rows, so traversal issues one request
     * per batch instead of one per row.
     */
    public static async prefetchChain(node: Node, anchorRows: NodeRecord[]): Promise<void> {
        let current: Node = node;
        let anchors = anchorRows.map((row) => row.id);
        let origin = commonNamespace(anchorRows, namespaceOf);
        while (current.outgoing !== null) {
            const rel = current.outgoing;
            const target = rel.target;
            if (
                rel.access === null ||
                !rel.access.deferred ||
                rel.hops?.multi() ||
                target === null
            ) {
                return;
            }
            const relTerms = rel.sourceTerms();
            const rows = await rel.access.prefetch(
                anchors,
                rel.anchorSide,
                relTerms.terms,
                relTerms.args,
                origin
            );
            if (rows === null) return;
            const nextIds = rows.map((row) => row[rel.nextField]);
            if (target.access === null || !target.access.deferred) return;
            const targetTerms = target.sourceTerms();
            origin = commonNamespace(rows, (row) => endpointNamespace(row, rel.nextSide));
            await target.access.prefetch(nextIds, targetTerms.terms, targetTerms.args, origin);
            anchors = nextIds;
            current = target;
        }
    }
}

export default Node;
