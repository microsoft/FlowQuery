import ASTNode from "../ast_node";

/**
 * Represents a reference to a query parameter (e.g., `$args`, `$name`).
 *
 * Parameter references are resolved at runtime from parameters passed
 * to the Runner, rather than from the variable scope.  Inside virtual
 * definitions `$args` / `$request` carry the pass-down filter and source
 * request; in top-level queries `$name` resolves from
 * `RunnerOptions.parameters`.
 *
 * @example
 * ```typescript
 * // In a CREATE VIRTUAL definition:
 * // CREATE VIRTUAL (:Node) AS { RETURN $args.id AS id }
 * // $args is a ParameterReference resolved from MATCH constraints
 * const ref = new ParameterReference("$args", true);
 * ref.parameterValue = { id: 42 };
 * console.log(ref.value()); // { id: 42 }
 * ```
 */
class ParameterReference extends ASTNode {
    private _name: string;
    private _parameterValue: any = null;
    private _inVirtualDefinition: boolean;

    /**
     * Creates a new ParameterReference.
     *
     * @param name - The parameter name (e.g., "$args")
     * @param inVirtualDefinition - True when parsed inside a `CREATE VIRTUAL` body
     */
    constructor(name: string, inVirtualDefinition: boolean = false) {
        super();
        this._name = name;
        this._inVirtualDefinition = inVirtualDefinition;
    }

    public get name(): string {
        return this._name;
    }

    /** True when this reference appears inside a virtual definition body. */
    public get inVirtualDefinition(): boolean {
        return this._inVirtualDefinition;
    }

    /**
     * Sets the runtime value for this parameter.
     */
    public set parameterValue(value: any) {
        this._parameterValue = value;
    }

    public isOperand(): boolean {
        return true;
    }

    public value(): any {
        return this._parameterValue;
    }

    public toString(): string {
        return `ParameterReference (${this._name})`;
    }
}

export default ParameterReference;
