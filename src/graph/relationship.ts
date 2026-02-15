import ASTNode from "../parsing/ast_node";
import Expression from "../parsing/expressions/expression";
import Hops from "./hops";
import Node from "./node";
import RelationshipData, { RelationshipRecord } from "./relationship_data";
import RelationshipMatchCollector, {
    RelationshipMatchRecord,
} from "./relationship_match_collector";

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
            return record[key] === expression.value();
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
    public setEndNode(node: Node): void {
        this._matches.endNode = node;
    }
    public _left_id_or_right_id(): string {
        return this._direction === "left" ? "left_id" : "right_id";
    }
    public async find(left_id: string, hop: number = 0): Promise<void> {
        // Save original source node
        const original = this._source;
        if (hop > 0) {
            // For hops greater than 0, the source becomes the target of the previous hop
            this._source = this._target;
        }
        if (hop === 0) {
            this._data?.reset();

            // Handle zero-hop case: when min is 0 on a variable-length relationship,
            // match source node as target (no traversal)
            if (this.hops?.multi() && this.hops.min === 0 && this._target) {
                // For zero-hop, target finds the same node as source (left_id)
                // No relationship match is pushed since no edge is traversed
                await this._target.find(left_id, hop);
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
                await this._target?.find(id, hop);
                if (hop + 1 < this.hops!.max) {
                    if (this._matches.isCircular(id)) {
                        this._matches.pop();
                        continue;
                    }
                    await this.find(id, hop + 1);
                }
                this._matches.pop();
            } else {
                // Below minimum hops: traverse the edge without yielding a match
                await this.find(id, hop + 1);
            }
        }
        // Restore original source node
        this._source = original;
    }
}

export default Relationship;
