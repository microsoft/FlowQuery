import Bindings from "../../graph/bindings";
import Identifier from "./identifier";

/**
 * Reference to a `LET`-bound binding by name.
 *
 * Distinct from {@link Reference} (which points to a scope-local
 * variable in the parser state) — a `BindingReference` is resolved
 * against the global {@link Bindings} singleton at execution time.
 */
class BindingReference extends Identifier {
    constructor(value: string) {
        super(value);
    }

    public get name(): string {
        return this._value;
    }

    public toString(): string {
        return `BindingReference (${this._value})`;
    }

    public value(): any {
        const bindings = Bindings.getInstance();
        if (!bindings.has(this._value)) {
            throw new Error(`Binding '${this._value}' is not defined`);
        }
        return bindings.get(this._value);
    }
}

export default BindingReference;
