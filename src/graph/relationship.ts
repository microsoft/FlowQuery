import ASTNode from "../parsing/ast_node";
import Expression from "../parsing/expressions/expression";
import Hops from "./hops";
import Node from "./node";
import RelationshipData, { RelationshipRecord } from "./relationship_data";
import RelationshipMatchCollector, {
    RelationshipMatchRecord,
} from "./relationship_match_collector";
import { RelationshipAccess, SourceTerms, buildTerms } from "./source_access";

class Relationship extends ASTNode {
    protected _identifier: string | null = null;
    protected _types: string[] = [];
    protected _properties: Map<string, Expression> = new Map();
    protected _hops: Hops = new Hops();

    protected _value: RelationshipMatchRecord | RelationshipMatchRecord[] | null = null;
    protected _matches: RelationshipMatchCollector = new RelationshipMatchCollector();

    protected _source: Node | null = null;
    protected _target: Node | null = null;
    protected _direction: "left" | "right" = "right";

    private _data: RelationshipData | null = null;
    private _access: RelationshipAccess | null = null;
    private _frames: Map<number, RelationshipRecord> = new Map();

    constructor(identifier: string | null = null, type: string | null = null) {
        super();
        this._identifier = identifier;
        if (type !== null) {
            this._types = [type];
        }
    }
    public set identifier(identifier: string) {
        this._identifier = identifier;
    }
    public get identifier(): string | null {
        return this._identifier;
    }
    public set type(type: string) {
        this._types = [type];
    }
    public get type(): string | null {
        return this._types.length > 0 ? this._types[0] : null;
    }
    public set types(types: string[]) {
        this._types = types;
    }
    public get types(): string[] {
        return this._types;
    }
    public get properties(): Map<string, Expression> {
        return this._properties;
    }
    public set properties(properties: Map<string, Expression>) {
        this._properties = properties;
    }
    private _matchesProperties(hop: number = 0): boolean {
        const data: RelationshipData = this._data!;
        for (const [key, expression] of this._properties) {
            const record: RelationshipRecord = data.current(hop)!;
            if (record === null) {
                throw new Error("No current relationship data available");
            }
            if (!(key in record)) {
                throw new Error("Relationship does not have property");
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
    public set hops(hops: Hops) {
        this._hops = hops;
    }
    public get hops(): Hops | null {
        return this._hops;
    }
    public setValue(relationship: Relationship, traversalId: string = ""): void {
        const match: RelationshipMatchRecord = this._matches.push(relationship, traversalId);
        this._value = this._matches.value();
    }
    public set source(node: Node | null) {
        this._source = node;
    }
    public get source(): Node | null {
        return this._source;
    }
    public set target(node: Node | null) {
        this._target = node;
    }
    public get target(): Node | null {
        return this._target;
    }
    public set direction(direction: "left" | "right") {
        this._direction = direction;
    }
    public get direction(): "left" | "right" {
        return this._direction;
    }
    public value(): RelationshipMatchRecord | RelationshipMatchRecord[] | null {
        return this._value;
    }
    public get matches(): RelationshipMatchRecord[] {
        return this._matches.matches;
    }
    public setData(data: RelationshipData | null): void {
        this._data = data;
    }
    public getData(): RelationshipData | null {
        return this._data;
    }
    /** @internal Provider-backed access; when set, rows are fetched on demand. */
    public setAccess(access: RelationshipAccess | null): void {
        this._access = access;
        this._frames.clear();
    }
    public get access(): RelationshipAccess | null {
        return this._access;
    }
    public sourceTerms(): SourceTerms {
        return buildTerms(this._properties, []);
    }
    /** Stored endpoint matched against the traversal's current node id. */
    public get anchorSide(): "left" | "right" {
        return this._direction === "left" ? "right" : "left";
    }
    /** Stored endpoint holding the id of the next node in traversal order. */
    public get nextField(): "left_id" | "right_id" {
        return this._direction === "left" ? "left_id" : "right_id";
    }
    /** The relationship row bound at `hop` (deferred frames or legacy data cursor). */
    public currentRecord(hop: number = 0): RelationshipRecord | null {
        if (this._access !== null) {
            return (this._frames.get(hop) as RelationshipRecord | undefined) ?? null;
        }
        return this._data?.current(hop) ?? null;
    }
    /** @internal Bind a row for `hop` (used by reversed plans). */
    public setFrame(hop: number, record: RelationshipRecord): void {
        this._frames.set(hop, record);
    }
    /** @internal Push a match for an explicitly supplied row. */
    public pushMatch(record: RelationshipRecord, traversalId: string): void {
        this._matches.push(this, traversalId, record);
        this._value = this._matches.value();
    }
    /** @internal Pop the most recent match. */
    public popMatch(): void {
        this._matches.pop();
        this._value = this._matches.value();
    }
    public setEndNode(node: Node): void {
        this._matches.endNode = node;
    }
    public _left_id_or_right_id(): string {
        return this._direction === "left" ? "left_id" : "right_id";
    }
    public async *find(left_id: string, hop: number = 0): AsyncGenerator<void> {
        if (this._access !== null) {
            yield* this._deferredFind(left_id, hop);
            return;
        }
        // Save original source node
        const original = this._source;
        if (hop > 0) {
            // For hops greater than 0, the source becomes the target of the previous hop
            this._source = this._target;
        }
        try {
            if (hop === 0) {
                this._data?.reset();

                // Handle zero-hop case: when min is 0 on a variable-length relationship,
                // match source node as target (no traversal)
                if (this.hops?.multi() && this.hops.min === 0 && this._target) {
                    // For zero-hop, target finds the same node as source (left_id)
                    // No relationship match is pushed since no edge is traversed
                    yield* this._target.find(left_id, hop);
                }
            }
            while (this._data!.find(left_id, hop, this._direction)) {
                const data: RelationshipRecord = this._data?.current(hop) as RelationshipRecord;
                const id = data[this._left_id_or_right_id()];
                if (hop + 1 >= this.hops!.min) {
                    this.setValue(this, left_id);
                    if (!this._matchesProperties(hop)) {
                        continue;
                    }
                    yield* this._target!.find(id, hop);
                    if (hop + 1 < this.hops!.max) {
                        if (this._matches.isCircular(id)) {
                            this._matches.pop();
                            continue;
                        }
                        yield* this.find(id, hop + 1);
                    }
                    this._matches.pop();
                } else {
                    // Below minimum hops: traverse the edge without yielding a match
                    yield* this.find(id, hop + 1);
                }
            }
        } finally {
            // Restore original source node
            this._source = original;
        }
    }
    private async *_deferredFind(left_id: string, hop: number): AsyncGenerator<void> {
        const original = this._source;
        if (hop > 0) {
            this._source = this._target;
        }
        try {
            if (hop === 0 && this.hops?.multi() && this.hops.min === 0 && this._target) {
                yield* this._target.find(left_id, hop);
            }
            const { terms, args } = this.sourceTerms();
            const target = this._target;
            for await (const page of this._access!.expand(left_id, this.anchorSide, terms, args)) {
                if (
                    target !== null &&
                    target.access !== null &&
                    target.access.deferred &&
                    page.length > 1
                ) {
                    const targetTerms = target.sourceTerms();
                    await target.access.prefetch(
                        page.map((row) => row[this.nextField]),
                        targetTerms.terms,
                        targetTerms.args
                    );
                }
                for (const row of page) {
                    yield* this._visit(row as RelationshipRecord, left_id, hop);
                }
            }
        } finally {
            this._source = original;
        }
    }
    private async *_visit(
        record: RelationshipRecord,
        left_id: string,
        hop: number
    ): AsyncGenerator<void> {
        this._frames.set(hop, record);
        const id = record[this.nextField];
        if (hop + 1 >= this.hops!.min) {
            if (!this.matchesRecord(record)) {
                return;
            }
            this.pushMatch(record, left_id);
            try {
                yield* this._target!.find(id, hop);
                if (hop + 1 < this.hops!.max && !this._matches.isCircular(id)) {
                    yield* this.find(id, hop + 1);
                }
            } finally {
                this._matches.pop();
            }
        } else {
            yield* this.find(id, hop + 1);
        }
    }
    public matchesRecord(record: RelationshipRecord): boolean {
        for (const [key, expression] of this._properties) {
            if (!(key in record)) {
                throw new Error("Relationship does not have property");
            }
            if (record[key] !== expression.value()) {
                return false;
            }
        }
        return true;
    }
}

export default Relationship;
