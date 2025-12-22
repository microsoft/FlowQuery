import Function from "./function";
import { FunctionDef } from "./function_metadata";

@FunctionDef({
    description: "Parses a JSON string into an object",
    category: "scalar",
    parameters: [
        { name: "text", description: "JSON string to parse", type: "string" }
    ],
    output: { description: "Parsed object or array", type: "object", example: { a: 1 } },
    examples: ["WITH '{\"a\": 1}' AS s RETURN tojson(s)"]
})
class ToJson extends Function {
    constructor() {
        super("tojson");
        this._expectedParameterCount = 1;
    }
    public value(): any {
        const str = this.getChildren()[0].value();
        if (typeof str !== "string") {
            throw new Error("Invalid arguments for tojson function");
        }
        return JSON.parse(str);
    }
}

export default ToJson;