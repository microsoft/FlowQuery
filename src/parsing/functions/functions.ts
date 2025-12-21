import Function from "./function";
import FunctionFactory from "./function_factory";

/**
 * Built-in function that lists all registered functions with their metadata.
 * 
 * Can be used in FlowQuery to discover available functions:
 * - `WITH functions() AS funcs RETURN funcs` - returns all functions
 * - `WITH functions('aggregation') AS funcs RETURN funcs` - returns functions in a category
 * 
 * @example
 * ```
 * WITH functions() AS funcs 
 * UNWIND funcs AS func 
 * RETURN func.name, func.description
 * ```
 */
class Functions extends Function {
    constructor() {
        super("functions");
        this._expectedParameterCount = null; // 0 or 1 parameter
    }

    public value(): any {
        const children = this.getChildren();
        
        if (children.length === 0) {
            // Return all functions
            return FunctionFactory.listFunctions();
        } else if (children.length === 1) {
            // Filter by category
            const category = children[0].value();
            if (typeof category === 'string') {
                return FunctionFactory.listFunctions({ category });
            }
            throw new Error("functions() category parameter must be a string");
        } else {
            throw new Error("functions() takes 0 or 1 parameters");
        }
    }
}

export default Functions;
