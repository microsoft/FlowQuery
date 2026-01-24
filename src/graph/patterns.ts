import Pattern from "./pattern";

class Patterns {
    private _patterns: Pattern[] = [];
    constructor(patterns: Pattern[] = []) {
        this._patterns = patterns;
    }
    public get patterns(): Pattern[] {
        return this._patterns;
    }
    public async initialize(): Promise<void> {
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
    }
    public set toDoNext(func: () => Promise<void>) {
        if (this._patterns.length > 0) {
            this._patterns[this._patterns.length - 1].endNode.todoNext = func;
        }
    }
    public async traverse(): Promise<void> {
        if (this._patterns.length > 0) {
            await this._patterns[0].startNode.next();
        }
    }
}

export default Patterns;
