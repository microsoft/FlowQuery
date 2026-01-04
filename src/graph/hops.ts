class Hops {
    private _min: number = 0;
    private _max: number = 1;

    public set min(min: number) {
        this._min = min;
    }
    public get min(): number {
        return this._min;
    }
    public set max(max: number) {
        this._max = max;
    }
    public get max(): number {
        return this._max;
    }
}

export default Hops;
