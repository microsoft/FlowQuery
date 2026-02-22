import ASTNode from "../ast_node";

/**
 * Represents a reference to a query parameter (e.g., $args).
 *
 * Parameter references are resolved at runtime from parameters passed
 * to the Runner, rather than from the variable scope. This enables
 * filter pass-down from MATCH constraints into virtual node/relationship
 * definitions.
 *
 * @example
 * ```typescript
 * // In a CREATE VIRTUAL definition:
 * // CREATE VIRTUAL (:Node) AS { RETURN $args.id AS id }
 * // $args is a ParameterReference resolved from MATCH constraints
 * const ref = new ParameterReference("$args");
 * ref.parameterValue = { id: 42 };
 * console.log(ref.value()); // { id: 42 }
 * ```
 */
class ParameterReference extends ASTNode {
    private _name: string;
    private _parameterValue: any = null;

    /**
     * Creates a new ParameterReference.
     *
     * @param name - The parameter name (e.g., "$args")
     */
    constructor(name: string) {
        super();
        this._name = name;
    }

    public get name(): string {
        return this._name;
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
