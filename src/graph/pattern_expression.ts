import Node from "./node";
import NodeReference from "./node_reference";
import Pattern from "./pattern";
import Relationship from "./relationship";

class PatternExpression extends Pattern {
    private _fetched: boolean = false;
    private _evaluation: boolean = false;
    public set identifier(id: string | null) {
        throw new Error("Cannot set identifier on PatternExpression");
    }
    public addElement(element: Relationship | Node): void {
        super.addElement(element);
    }
    public verify(): void {
        if (this._chain.length === 0) {
            throw new Error("PatternExpression must contain at least one element");
        }
        const referenced = this._chain.some((element) => {
            if (element instanceof NodeReference) {
                return true;
            }
            return false;
        });
        if (!referenced) {
            throw new Error("PatternExpression must contain at least one NodeReference");
        }
    }
    public async evaluate(): Promise<void> {
        this._evaluation = false;
        for await (const _ of this.startNode.next()) {
            this._evaluation = true;
        }
    }
    public value(): boolean {
        return this._evaluation;
    }
    public async fetchData(): Promise<void> {
        if (this._fetched) {
            return;
        }
        await super.fetchData();
        this._fetched = true;
    }
}

export default PatternExpression;
