import ASTNode from "../ast_node";
import Function from "./function";
import { FunctionDef } from "./function_metadata";

@FunctionDef({
    description:
        "Rounds a number to the nearest integer, or to an optional number of decimal places",
    category: "scalar",
    parameters: [
        { name: "value", description: "Number to round", type: "number" },
        {
            name: "precision",
            description: "Number of decimal places to round to (optional)",
            type: "integer",
        },
    ],
    output: { description: "Rounded number", type: "number", example: 4 },
    examples: ["WITH 3.7 AS n RETURN round(n)", "RETURN round(3.14159, 2)"],
})
class Round extends Function {
    constructor() {
        super("round");
    }
    public set parameters(nodes: ASTNode[]) {
        if (nodes.length < 1 || nodes.length > 2) {
            throw new Error(`Function round expected 1 or 2 parameters, but got ${nodes.length}`);
        }
        this.children = nodes;
    }
    public value(): any {
        const children = this.getChildren();
        const value = children[0].value();
        if (value === null || value === undefined) {
            return null;
        }
        if (typeof value !== "number") {
            throw new Error("Invalid argument for round function");
        }
        if (children.length === 1) {
            return Math.round(value);
        }
        const precision = children[1].value();
        if (precision === null || precision === undefined) {
            return null;
        }
        if (typeof precision !== "number" || !Number.isInteger(precision)) {
            throw new Error("Invalid precision argument for round function");
        }
        // Round half away from zero to `precision` decimal places.
        const factor = Math.pow(10, precision);
        return (Math.sign(value) * Math.round(Math.abs(value) * factor)) / factor;
    }
}

export default Round;
