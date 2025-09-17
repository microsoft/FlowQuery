import PredicateFunction from "./predicate_function";

class PredicateSum extends PredicateFunction {
    constructor() {
        super("sum");
    }

    public value(): any {
        this.reference.referred = this._valueHolder;
        const array = this.array.value();
        if (array === null || !Array.isArray(array)) {
            throw new Error("Invalid array for sum function");
        }
        let _sum: any | null = null;
        for(let i = 0; i < array.length; i++) {
            this._valueHolder.holder = array[i];
            if (this.where === null || this.where.value()) {
                if (_sum === null) {
                    _sum = this._return.value();
                } else {
                    _sum += this._return.value();
                }
            }
        }
        return _sum;
    }
}

export default PredicateSum;