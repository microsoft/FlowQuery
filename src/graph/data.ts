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
    private _indexes: Map<string, Map<string, IndexEntry>> = new Map();
    private _current: number = -1;
    constructor(indexes: Map<string, Map<string, IndexEntry>>) {
        this._indexes = indexes;
    }
    public index(name: string): Map<string, IndexEntry> {
        if (!this._indexes.has(name)) {
            this._indexes.set(name, new Map());
        }
        return this._indexes.get(name)!;
    }
    public get indexes(): Map<string, Map<string, IndexEntry>> {
        return this._indexes;
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
        const idx = this.layer(level).index(key);
        idx.clear();
        this._records.forEach((record, i) => {
            if (record.hasOwnProperty(key)) {
                if (!idx.has(record[key])) {
                    idx.set(record[key], new IndexEntry());
                }
                idx.get(record[key])!.add(i);
            }
        });
    }
    public layer(level: number = 0): Layer {
        if (!this._layers.has(level)) {
            const first = this._layers.get(0)!;
            const clonedIndexes = new Map<string, Map<string, IndexEntry>>();
            for (const [name, indexMap] of first.indexes) {
                const clonedMap = new Map<string, IndexEntry>();
                for (const [key, entry] of indexMap) {
                    clonedMap.set(key, entry.clone());
                }
                clonedIndexes.set(name, clonedMap);
            }
            this._layers.set(level, new Layer(clonedIndexes));
        }
        return this._layers.get(level)!;
    }
    protected _find(key: string, level: number = 0, indexName?: string): boolean {
        const idx = indexName
            ? this.layer(level).index(indexName)
            : this.layer(level).indexes.values().next().value;
        if (!idx || !idx.has(key)) {
            this.layer(level).current = this._records.length; // Move to end
            return false;
        } else {
            const entry = idx.get(key)!;
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
            for (const indexMap of layer.indexes.values()) {
                for (const entry of indexMap.values()) {
                    entry.reset();
                }
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
