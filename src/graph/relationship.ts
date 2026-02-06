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
    protected _type: string | null = null;
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
        this._type = type;
    }
    public set identifier(identifier: string) {
        this._identifier = identifier;
    }
    public get identifier(): string | null {
        return this._identifier;
    }
    public set type(type: string) {
        this._type = type;
    }
    public get type(): string | null {
        return this._type;
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
    public setValue(relationship: Relationship): void {
        const match: RelationshipMatchRecord = this._matches.push(relationship);
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
    public async find(left_id: string, hop: number = 0): Promise<void> {
        // Save original source node
        const original = this._source;
        const isLeft = this._direction === "left";
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
        const findMatch = isLeft
            ? (id: string, h: number) => this._data!.findReverse(id, h)
            : (id: string, h: number) => this._data!.find(id, h);
        const followId = isLeft ? "left_id" : "right_id";
        while (findMatch(left_id, hop)) {
            const data: RelationshipRecord = this._data?.current(hop) as RelationshipRecord;
            if (hop >= this.hops!.min) {
                this.setValue(this);
                if (!this._matchesProperties(hop)) {
                    continue;
                }
                await this._target?.find(data[followId], hop);
                if (this._matches.isCircular()) {
                    throw new Error("Circular relationship detected");
                }
                if (hop + 1 < this.hops!.max) {
                    await this.find(data[followId], hop + 1);
                }
                this._matches.pop();
            }
        }
        // Restore original source node
        this._source = original;
    }
}

export default Relationship;
