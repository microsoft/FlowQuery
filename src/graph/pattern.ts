import ASTNode from "../parsing/ast_node";
import Database from "./database";
import Node from "./node";
import NodeData from "./node_data";
import NodeReference from "./node_reference";
import Relationship from "./relationship";
import RelationshipData from "./relationship_data";
import RelationshipReference from "./relationship_reference";

class Pattern extends ASTNode {
    private _identifier: string | null = null;
    protected _chain: (Node | Relationship)[] = [];
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
    public async fetchData(): Promise<void> {
        const db: Database = Database.getInstance();
        for (const element of this._chain) {
            if (
                element.constructor === NodeReference ||
                element.constructor === RelationshipReference
            ) {
                continue;
            }
            const data = await db.getData(element);
            if (element.constructor === Node) {
                element.setData(data as NodeData);
            } else if (element.constructor === Relationship) {
                element.setData(data as RelationshipData);
            }
        }
    }
}
export default Pattern;
