import ASTNode from "../parsing/ast_node";
import DataResolver from "./data_resolver";
import {
    commonNamespace,
    commonOrigin,
    endpointNamespace,
    namespaceOf,
    originMatches,
} from "./graph_records";
import Node from "./node";
import NodeData, { NodeRecord } from "./node_data";
import NodeReference from "./node_reference";
import Relationship, { RelationshipScope } from "./relationship";
import RelationshipData, { RelationshipRecord } from "./relationship_data";
import RelationshipReference from "./relationship_reference";
import {
    IDENTITY_PROPERTY,
    MemoryNodeAccess,
    MemoryRelationshipAccess,
    NodeAccess,
    RelationshipAccess,
    isStaticExpression,
} from "./source_access";
import type SourceContext from "./source_context";

class Pattern extends ASTNode {
    private _identifier: string | null = null;
    protected _chain: (Node | Relationship)[] = [];
    private _context: SourceContext | null = null;
    private _deferred: boolean = false;
    private _scope: RelationshipScope = new RelationshipScope();
    public set identifier(id: string | null) {
        this._identifier = id;
    }
    public get identifier(): string | null {
        return this._identifier;
    }
    public addElement(element: Relationship | Node): void {
        if (
            this._chain.length > 0 &&
            this._chain[this._chain.length - 1].constructor === element.constructor
        ) {
            throw new Error(
                "Cannot add two consecutive elements of the same type to the graph pattern"
            );
        }
        if (this._chain.length > 0) {
            const last = this._chain[this._chain.length - 1];
            if (last instanceof Node && element instanceof Relationship) {
                last.outgoing = element as Relationship;
                element.source = last as Node;
            }
            if (last instanceof Relationship && element instanceof Node) {
                last.target = element as Node;
                element.incoming = last as Relationship;
            }
        }
        this._chain.push(element);
        if (element instanceof Relationship) {
            element.scope = this._scope;
        }
    }
    /**
     * @internal Share one relationship-uniqueness scope across several
     * patterns (all patterns of one MATCH clause).
     */
    public set relationshipScope(scope: RelationshipScope) {
        this._scope = scope;
        for (const element of this._chain) {
            if (element instanceof Relationship) element.scope = scope;
        }
    }
    public get chain(): (Node | Relationship)[] {
        return this._chain;
    }
    public get startNode(): Node {
        if (this._chain.length === 0) {
            throw new Error("Pattern is empty");
        }
        const first = this._chain[0];
        if (first instanceof Node) {
            return first;
        }
        throw new Error("Pattern does not start with a node");
    }
    public get endNode(): Node {
        if (this._chain.length === 0) {
            throw new Error("Pattern is empty");
        }
        const last = this._chain[this._chain.length - 1];
        if (last instanceof Node) {
            return last;
        }
        throw new Error("Pattern does not end with a node");
    }
    public value(): any {
        return Array.from(this.values());
    }
    public *values(): Generator<any> {
        for (let i = 0; i < this._chain.length; i++) {
            const element = this._chain[i];
            if (element instanceof Node) {
                // Skip node if previous element was a zero-hop relationship (no matches)
                if (
                    i > 0 &&
                    this._chain[i - 1] instanceof Relationship &&
                    (this._chain[i - 1] as Relationship).matches.length === 0
                ) {
                    continue;
                }
                yield element.value();
            } else if (element instanceof Relationship) {
                let j = 0;
                for (const match of element.matches) {
                    yield match;
                    if (j < element.matches.length - 1) {
                        yield match.endNode;
                    }
                    j++;
                }
            }
        }
    }
    public async fetchData(ctx: SourceContext | null = null): Promise<void> {
        const resolver = DataResolver.getInstance();
        const context = ctx ?? resolver.sourceContext;
        this._context = context;
        this._deferred = false;
        for (const element of this._chain) {
            if (
                element.constructor === NodeReference ||
                element.constructor === RelationshipReference
            ) {
                continue;
            }
            const access = context !== null ? resolver.getAccess(element, context) : null;
            if (access !== null) {
                this._deferred = true;
                if (element.constructor === Node) {
                    (element as Node).setData(null);
                    (element as Node).setAccess(access as NodeAccess);
                } else if (element.constructor === Relationship) {
                    (element as Relationship).setData(null);
                    (element as Relationship).setAccess(access as RelationshipAccess);
                }
                continue;
            }
            const data = await resolver.getData(element);
            if (element.constructor === Node) {
                (element as Node).setAccess(null);
                element.setData(data as NodeData);
            } else if (element.constructor === Relationship) {
                (element as Relationship).setAccess(null);
                element.setData(data as RelationshipData);
            }
        }
    }
    /** True when at least one element is read through a source provider. */
    public get deferred(): boolean {
        return this._deferred;
    }
    /**
     * Enumerate pattern matches.  Provider-backed patterns may start from
     * the more selective end node; otherwise traversal starts at the
     * first node exactly as before.
     */
    public async *traverse(): AsyncGenerator<void> {
        const plan = this._deferred ? this._planReversal() : null;
        if (plan === null) {
            yield* this.startNode.next();
            return;
        }
        yield* this._reverseFrom(
            plan,
            plan.nodes.length - 1,
            undefined,
            new Array(plan.rels.length)
        );
    }

    private _planReversal(): ReversalPlan | null {
        const ctx = this._context;
        if (
            ctx === null ||
            !ctx.options.reorder ||
            this._identifier !== null ||
            this._chain.length < 3
        ) {
            return null;
        }
        const nodes: Node[] = [];
        const rels: Relationship[] = [];
        const local = new Set<Node | ASTNode | string>();
        for (const element of this._chain) {
            if (element.constructor === Node) {
                local.add(element);
                if (element.identifier !== null) local.add(element.identifier);
            }
        }
        for (const element of this._chain) {
            if (element instanceof Relationship) {
                if (element.constructor !== Relationship || element.hops?.multi()) return null;
                rels.push(element);
            } else {
                if (element.constructor !== Node && element.constructor !== NodeReference)
                    return null;
                if (element.constructor === NodeReference) {
                    // A reference to a node of this same pattern is only bound
                    // during forward traversal.
                    const ref = element as NodeReference;
                    if (
                        (ref.reference !== null && local.has(ref.reference)) ||
                        (ref.identifier !== null && local.has(ref.identifier))
                    ) {
                        return null;
                    }
                }
                if (element.constructor === Node) {
                    for (const expression of element.properties.values()) {
                        if (!isStaticExpression(expression)) return null;
                    }
                }
                nodes.push(element);
            }
        }
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        const firstScore = Pattern._score(first);
        const lastScore = Pattern._score(last);
        let reverse = lastScore > firstScore;
        let reason = `start score ${firstScore}, end score ${lastScore}`;
        if (lastScore === firstScore && first.access !== null && last.access !== null) {
            const a = first.access.estimate(first.sourceTerms().terms, first.sourceTerms().args);
            const b = last.access.estimate(last.sourceTerms().terms, last.sourceTerms().args);
            if (a !== undefined && b !== undefined) {
                reason += `, estimates ${a} vs ${b}`;
                reverse = b < a;
            }
        }
        ctx.stats.plans.push({
            pattern: this._describe(),
            start: reverse ? "last" : "first",
            reason,
        });
        if (!reverse) return null;
        const nodeAccess = nodes.map((n) => {
            if (n.constructor === NodeReference) return null;
            return n.access ?? new MemoryNodeAccess(n.getData()?.records ?? []);
        });
        const relAccess = rels.map(
            (r) => r.access ?? new MemoryRelationshipAccess(r.getData()?.records ?? [])
        );
        return { nodes, rels, nodeAccess, relAccess };
    }

    /** Selectivity rank of a candidate start node (higher is more selective). */
    private static _score(node: Node): number {
        if (node instanceof NodeReference) return 3;
        const { terms } = node.sourceTerms();
        if (node.access !== null ? node.access.identityLookup(terms) : identityPinned(terms)) {
            return 2;
        }
        if (node.access !== null && node.access.deferred && node.access.pushes(terms)) return 1;
        return 0;
    }

    private _describe(): string {
        return this._chain
            .map((e) => {
                if (e instanceof Node)
                    return `(${e.identifier ?? ""}${e.labels.map((l) => `:${l}`).join("")})`;
                const r = e as Relationship;
                const body = `[${r.identifier ?? ""}${r.types.map((t) => `:${t}`).join("|")}]`;
                return r.direction === "left" ? `<-${body}-` : `-${body}->`;
            })
            .join("");
    }

    private async *_reverseFrom(
        plan: ReversalPlan,
        i: number,
        id: any,
        relRows: RelationshipRecord[],
        origin?: string
    ): AsyncGenerator<void> {
        const node = plan.nodes[i];
        const access = plan.nodeAccess[i];
        let pages: AsyncIterable<NodeRecord[]> | NodeRecord[][];
        let filter = true;
        if (access === null) {
            const referenced = (node as NodeReference).reference?.value();
            if (
                referenced == null ||
                (id !== undefined && (id !== referenced.id || !originMatches(referenced, origin)))
            ) {
                return;
            }
            pages = [[referenced]];
            filter = false;
        } else {
            const { terms, args } = node.sourceTerms();
            if (id !== undefined) {
                pages = [(await access.lookup(id, terms, args, origin)) as NodeRecord[]];
            } else {
                pages = access.start(terms, args) as AsyncIterable<NodeRecord[]>;
            }
        }
        for await (const page of pages) {
            const rows = filter ? page.filter((row) => node.matchesRecord(row)) : page;
            const rel = i > 0 ? plan.rels[i - 1] : null;
            // Walking backwards, the anchor is the stored endpoint of the
            // node we are on, and the next id is the opposite endpoint.
            const side: "left" | "right" =
                rel !== null && rel.nextField === "left_id" ? "left" : "right";
            const nextField = side === "left" ? "right_id" : "left_id";
            const nextSide: "left" | "right" = side === "left" ? "right" : "left";
            const nextNamespace = (r: Record<string, any>) => endpointNamespace(r, nextSide);
            const relTerms = rel !== null ? rel.sourceTerms() : null;
            if (rel !== null && rows.length > 1) {
                const buffered = await plan.relAccess[i - 1].prefetch(
                    rows.map((r) => r.id),
                    side,
                    relTerms!.terms,
                    relTerms!.args,
                    commonOrigin(rows)
                );
                const prev = plan.nodeAccess[i - 1];
                if (buffered !== null && prev !== null && prev.deferred) {
                    const prevTerms = plan.nodes[i - 1].sourceTerms();
                    await prev.prefetch(
                        buffered.map((r) => r[nextField]),
                        prevTerms.terms,
                        prevTerms.args,
                        commonNamespace(buffered, nextNamespace)
                    );
                }
            }
            for (const row of rows) {
                node.setValue(row);
                if (rel === null) {
                    yield* this._emitReversed(plan, relRows);
                    continue;
                }
                for await (const relPage of plan.relAccess[i - 1].expand(
                    row.id,
                    side,
                    relTerms!.terms,
                    relTerms!.args,
                    namespaceOf(row)
                )) {
                    const prev = plan.nodeAccess[i - 1];
                    if (prev !== null && prev.deferred && relPage.length > 1) {
                        const prevTerms = plan.nodes[i - 1].sourceTerms();
                        await prev.prefetch(
                            relPage.map((r) => r[nextField]),
                            prevTerms.terms,
                            prevTerms.args,
                            commonNamespace(relPage, nextNamespace)
                        );
                    }
                    for (const relRow of relPage as RelationshipRecord[]) {
                        if (!rel.matchesRecord(relRow)) continue;
                        const claimed = rel.claim(relRow);
                        if (claimed === null) continue;
                        try {
                            relRows[i - 1] = relRow;
                            yield* this._reverseFrom(
                                plan,
                                i - 1,
                                relRow[nextField],
                                relRows,
                                nextNamespace(relRow)
                            );
                        } finally {
                            rel.release(claimed);
                        }
                    }
                }
            }
        }
    }

    /** All nodes are bound: publish relationship matches in pattern order. */
    private async *_emitReversed(
        plan: ReversalPlan,
        relRows: RelationshipRecord[]
    ): AsyncGenerator<void> {
        for (let j = 0; j < plan.rels.length; j++) {
            const rel = plan.rels[j];
            rel.setFrame(0, relRows[j]);
            rel.pushMatch(relRows[j], plan.nodes[j].value()!.id);
            rel.setEndNode(plan.nodes[j + 1]);
        }
        try {
            yield;
        } finally {
            for (let j = plan.rels.length - 1; j >= 0; j--) {
                plan.rels[j].popMatch();
                if (plan.rels[j].access === null) {
                    plan.rels[j].clearFrame(0);
                }
            }
        }
    }
}

/** The terms pin a definition node's id (eager nodes are always definitions). */
function identityPinned(terms: { op: string; property: string; value?: any }[]): boolean {
    return terms.some(
        (t) =>
            t.op === "eq" &&
            (t.property === "id" || t.property === IDENTITY_PROPERTY) &&
            t.value != null
    );
}

interface ReversalPlan {
    nodes: Node[];
    rels: Relationship[];
    nodeAccess: (NodeAccess | null)[];
    relAccess: RelationshipAccess[];
}
export default Pattern;
