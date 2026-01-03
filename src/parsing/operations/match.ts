import Pattern from "../../graph/pattern";
import Operation from "./operation";

class Match extends Operation {
    private _patterns: Pattern[] = [];

    constructor(patterns: Pattern[]) {
        super();
        this._patterns = patterns;
    }
    public get patterns(): Pattern[] {
        return this._patterns;
    }
    /**
     * Executes the match operation by chaining the patterns together.
     * After each pattern match, it continues to the next operation in the chain.
     * @return Promise<void>
     */
    public async run(): Promise<void> {
        let previous: Pattern | null = null;
        for (const pattern of this._patterns) {
            await pattern.fetchData(); // Ensure data is loaded
            if (previous !== null) {
                // Chain the patterns together
                previous.endNode.todoNext = async () => {
                    await pattern.startNode.next();
                };
            }
            previous = pattern;
        }
        // After each complete pattern match, continue to the next operation
        this._patterns[this._patterns.length - 1].endNode.todoNext = async () => {
            await this.next?.run();
        };
        // Kick off the matching with the first pattern's start node
        await this._patterns[0].startNode.next();
    }
}

export default Match;
