import Function from "./function";
import { FunctionDef } from "./function_metadata";

@FunctionDef({
    description: "Generates a random number between 0 and 1",
    category: "scalar",
    parameters: [],
    output: { description: "Random number between 0 and 1", type: "number", example: 0.7234 },
    examples: ["WITH rand() AS r RETURN r"]
})
class Rand extends Function {
    constructor() {
        super("rand");
        this._expectedParameterCount = 0;
    }
    public value(): any {
        return Math.random();
    }
}

export default Rand;