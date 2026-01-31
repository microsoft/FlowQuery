class IndexEntry {
    private _positions: number[];
    private _index: number = -1;

    constructor(positions: number[] = []) {
        this._positions = positions;
    }
    public add(position: number): void {
        this._positions.push(position);
    }
    public get position(): number {
        return this._positions[this._index];
    }
    public reset(): void {
        this._index = -1;
    }
    public next(): boolean {
        if (this._index < this._positions.length - 1) {
            this._index++;
            return true;
        }
        return false;
    }
    public clone(): IndexEntry {
        return new IndexEntry([...this._positions]);
    }
}

class Layer {
    private _index: Map<string, IndexEntry> = new Map();
    private _current: number = -1;
    constructor(index: Map<string, IndexEntry>) {
        this._index = index;
    }
    public get index(): Map<string, IndexEntry> {
        return this._index;
    }
    public get current(): number {
        return this._current;
    }
    public set current(value: number) {
        this._current = value;
    }
}

class Data {
    protected _records: Record<string, any>[] = [];
    private _layers: Map<number, Layer> = new Map();

    constructor(records: Record<string, any>[] = []) {
        this._records = records;
        this._layers.set(0, new Layer(new Map()));
    }
    protected _buildIndex(key: string, level: number = 0): void {
        this.layer(level).index.clear();
        this._records.forEach((record, idx) => {
            if (record.hasOwnProperty(key)) {
                if (!this.layer(level).index.has(record[key])) {
                    this.layer(level).index.set(record[key], new IndexEntry());
                }
                this.layer(level).index.get(record[key])!.add(idx);
            }
        });
    }
    public layer(level: number = 0): Layer {
        if (!this._layers.has(level)) {
            const first = this._layers.get(0)!;
            const cloned = new Map<string, IndexEntry>();
            for (const [key, entry] of first.index) {
                cloned.set(key, entry.clone());
            }
            this._layers.set(level, new Layer(cloned));
        }
        return this._layers.get(level)!;
    }
    protected _find(key: string, level: number = 0): boolean {
        if (!this.layer(level).index.has(key)) {
            this.layer(level).current = this._records.length; // Move to end
            return false;
        } else {
            const entry = this.layer(level).index.get(key)!;
            const more = entry.next();
            if (!more) {
                this.layer(level).current = this._records.length; // Move to end
                return false;
            }
            this.layer(level).current = entry.position;
            return true;
        }
    }
    public reset(): void {
        for (const layer of this._layers.values()) {
            layer.current = -1;
            for (const entry of layer.index.values()) {
                entry.reset();
            }
        }
    }
    public next(level: number = 0): boolean {
        if (this.layer(level).current < this._records.length - 1) {
            this.layer(level).current++;
            return true;
        }
        return false;
    }
    public current(level: number = 0): Record<string, any> | null {
        if (this.layer(level).current < this._records.length) {
            return this._records[this.layer(level).current];
        }
        return null;
    }
}

export default Data;
