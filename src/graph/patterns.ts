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
        for (const pattern of this._patterns) {
            await pattern.fetchData();
        }
    }
    public async *traverse(): AsyncGenerator<void> {
        if (this._patterns.length === 0) return;
        yield* this._chainPatterns(0);
    }
    private async *_chainPatterns(index: number): AsyncGenerator<void> {
        for await (const _ of this._patterns[index].startNode.next()) {
            if (index + 1 < this._patterns.length) {
                yield* this._chainPatterns(index + 1);
            } else {
                yield;
            }
        }
    }
}

export default Patterns;
