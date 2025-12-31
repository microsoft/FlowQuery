import ASTNode from "../parsing/ast_node";
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
            typeof this._chain[this._chain.length - 1] === typeof element
        ) {
            throw new Error(
                "Cannot add two consecutive elements of the same type to the graph pattern"
            );
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
    public setValue(value: any): void {
        this._value = value;
    }
    public value(): any {
        return this._value;
    }
}
export default Pattern;
