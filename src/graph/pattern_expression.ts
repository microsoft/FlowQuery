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
        if (this._chain.length == 0 && !(element instanceof NodeReference)) {
            throw new Error("PatternExpression must start with a NodeReference");
        }
        super.addElement(element);
    }
    public async evaluate(): Promise<void> {
        this._evaluation = false;
        this.endNode.todoNext = async () => {
            this._evaluation = true;
        };
        await this.startNode.next();
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
