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
    public next(): boolean {
        if (this._index < this._positions.length - 1) {
            this._index++;
            return true;
        }
        return false;
    }
}

class Data {
    protected _records: Record<string, any>[] = [];
    protected _index: Map<string, IndexEntry> = new Map();
    protected _current: number = -1;

    constructor(records: Record<string, any>[] = []) {
        this._records = records;
    }
    protected _buildIndex(key: string): void {
        this._index.clear();
        this._records.forEach((record, idx) => {
            if (record.hasOwnProperty(key)) {
                if (!this._index.has(record[key])) {
                    this._index.set(record[key], new IndexEntry());
                }
                this._index.get(record[key])!.add(idx);
            }
        });
    }
    protected _find(key: string): boolean {
        if (!this._index.has(key)) {
            this._current = this._records.length; // Move to end
            return false;
        } else {
            const entry = this._index.get(key)!;
            const more = entry.next();
            if (!more) {
                this._current = this._records.length; // Move to end
                return false;
            }
            this._current = entry.position;
            return true;
        }
    }
    public next(): boolean {
        if (this._current < this._records.length - 1) {
            this._current++;
            return true;
        }
        return false;
    }
    public current(): Record<string, any> | null {
        if (this._current < this._records.length) {
            return this._records[this._current];
        }
        return null;
    }
}

export default Data;
