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
    /**
     * When `true`, resolving a name that is not present in the global
     * {@link Bindings} store yields `undefined` instead of throwing.
     *
     * Used for projection references (`RETURN name` / `WITH name`),
     * where a bare unresolved identifier historically evaluated to
     * `undefined`; lenient mode preserves that behaviour for genuinely
     * unknown names while still resolving real `LET` bindings.
     */
    private _optional: boolean;

    constructor(value: string, optional: boolean = false) {
        super(value);
        this._optional = optional;
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
            if (this._optional) {
                return undefined;
            }
            throw new Error(`Binding '${this._value}' is not defined`);
        }
        return bindings.get(this._value);
    }
}

export default BindingReference;
