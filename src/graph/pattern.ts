import GraphNode from "./physical_node";
import GraphRelationship from "./physical_relationship";

class Pattern {
    private _chain: (GraphNode | GraphRelationship)[] = [];
    public addElement(element: GraphRelationship | GraphNode): void {
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
    public get chain(): (GraphNode | GraphRelationship)[] {
        return this._chain;
    }
}
export default Pattern;
