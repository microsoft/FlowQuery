import Node from "../../graph/node";
import Pattern from "../../graph/pattern";
import Patterns from "../../graph/patterns";
import Operation from "./operation";

class Match extends Operation {
    private _patterns: Patterns | null = null;
    private _optional: boolean = false;

    constructor(patterns: Pattern[] = [], optional: boolean = false) {
        super();
        this._patterns = new Patterns(patterns);
        this._optional = optional;
    }
    public get patterns(): Pattern[] {
        return this._patterns ? this._patterns.patterns : [];
    }
    public get optional(): boolean {
        return this._optional;
    }
    protected toString(): string {
        return this._optional ? "OptionalMatch" : "Match";
    }
    /**
     * Executes the match operation by chaining the patterns together.
     * After each pattern match, it continues to the next operation in the chain.
     * If optional and no match is found, continues with null values.
     * @return Promise<void>
     */
    public async run(): Promise<void> {
        await this._patterns!.initialize();
        let matched = false;
        this._patterns!.toDoNext = async () => {
            matched = true;
            // Continue to the next operation after all patterns are matched
            await this.next?.run();
        };
        // Kick off the graph pattern traversal
        await this._patterns!.traverse();
        // For OPTIONAL MATCH: if nothing matched, continue with null values
        if (!matched && this._optional) {
            for (const pattern of this._patterns!.patterns) {
                for (const element of pattern.chain) {
                    if (element instanceof Node) {
                        element.setValue(null!);
                    }
                }
            }
            await this.next?.run();
        }
    }
}

export default Match;
