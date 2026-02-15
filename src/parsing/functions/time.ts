import Function from "./function";
import { FunctionDef } from "./function_metadata";
import { buildTimeObject, parseTemporalArg } from "./temporal_utils";

/**
 * Returns a time value (with timezone offset awareness).
 * When called with no arguments, returns the current UTC time.
 * When called with a string argument, parses it as an ISO 8601 time.
 *
 * @example
 * ```
 * RETURN time() AS now
 * RETURN time('12:30:00') AS t
 * ```
 */
@FunctionDef({
    description:
        "Returns a time value. With no arguments returns the current UTC time. " +
        "Accepts an ISO 8601 time string or a map of components (hour, minute, second, millisecond).",
    category: "scalar",
    parameters: [
        {
            name: "input",
            description: "Optional. An ISO 8601 time string (HH:MM:SS) or a map of components.",
            type: "string",
            required: false,
        },
    ],
    output: {
        description: "A time object with properties: hour, minute, second, millisecond, formatted",
        type: "object",
    },
    examples: [
        "RETURN time() AS now",
        "RETURN time('12:30:00') AS t",
        "WITH time() AS t RETURN t.hour, t.minute",
    ],
})
class Time extends Function {
    constructor() {
        super("time");
        this._expectedParameterCount = null;
    }

    public value(): any {
        const children = this.getChildren();
        if (children.length > 1) {
            throw new Error("time() accepts at most one argument");
        }

        const d: Date =
            children.length === 1 ? parseTemporalArg(children[0].value(), "time") : new Date();

        return buildTimeObject(d, true);
    }
}

export default Time;
