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
    public async run(): Promise<void> {
        let previous: Pattern | null = null;
        for (const pattern of this._patterns) {
            await pattern.fetchData();
            if (previous !== null) {
                previous.endNode.setCallback(async () => {
                    await pattern.startNode.next();
                });
            }
            previous = pattern;
        }
        this._patterns[this._patterns.length - 1].endNode.setCallback(async () => {
            await this.next?.run();
        });
        await this._patterns[0].startNode.next();
    }
}

export default Match;
