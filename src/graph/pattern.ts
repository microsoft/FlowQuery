import ASTNode from "../parsing/ast_node";
import Database from "./database";
import Node from "./node";
import Relationship from "./relationship";

class Pattern extends ASTNode {
    private _identifier: string | null = null;
    private _chain: (Node | Relationship)[] = [];
    private _value: any = null;
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
            if (last.constructor === Node && element.constructor === Relationship) {
                last.outgoing = element as Relationship;
                element.source = last as Node;
            }
            if (last.constructor === Relationship && element.constructor === Node) {
                last.target = element as Node;
                element.incoming = last as Relationship;
            }
        }
        this._chain.push(element);
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
    public setValue(value: any): void {
        this._value = value;
    }
    public value(): any {
        return Array.from(this.values());
    }
    public *values(): Generator<any> {
        for (const element of this._chain) {
            yield element.value();
        }
    }
    public async fetchData(): Promise<void> {
        const db: Database = Database.getInstance();
        for (const element of this._chain) {
            if (element.reference! !== null) {
                continue;
            }
            const data = await db.getData(element);
            element.setData(data);
        }
    }
}
export default Pattern;
