import Pattern from "../../graph/pattern";
import Patterns from "../../graph/patterns";
import Operation from "./operation";

class Match extends Operation {
    private _patterns: Patterns | null = null;

    constructor(patterns: Pattern[] = []) {
        super();
        this._patterns = new Patterns(patterns);
    }
    public get patterns(): Pattern[] {
        return this._patterns ? this._patterns.patterns : [];
    }
    /**
     * Executes the match operation by chaining the patterns together.
     * After each pattern match, it continues to the next operation in the chain.
     * @return Promise<void>
     */
    public async run(): Promise<void> {
        await this._patterns!.initialize();
        this._patterns!.toDoNext = async () => {
            // Continue to the next operation after all patterns are matched
            await this.next?.run();
        };
        // Kick off the graph pattern traversal
        await this._patterns!.traverse();
    }
}

export default Match;
