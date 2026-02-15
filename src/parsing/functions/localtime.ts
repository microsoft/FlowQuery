import Function from "./function";
import { FunctionDef } from "./function_metadata";
import { buildTimeObject, parseTemporalArg } from "./temporal_utils";

/**
 * Returns a local time value (no timezone offset).
 * When called with no arguments, returns the current local time.
 * When called with a string argument, parses it.
 *
 * @example
 * ```
 * RETURN localtime() AS now
 * RETURN localtime('14:30:00') AS t
 * ```
 */
@FunctionDef({
    description:
        "Returns a local time value (no timezone). With no arguments returns the current local time. " +
        "Accepts an ISO 8601 time string or a map of components.",
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
        "RETURN localtime() AS now",
        "RETURN localtime('14:30:00') AS t",
        "WITH localtime() AS t RETURN t.hour, t.minute",
    ],
})
class LocalTime extends Function {
    constructor() {
        super("localtime");
        this._expectedParameterCount = null;
    }

    public value(): any {
        const children = this.getChildren();
        if (children.length > 1) {
            throw new Error("localtime() accepts at most one argument");
        }

        const d: Date =
            children.length === 1 ? parseTemporalArg(children[0].value(), "localtime") : new Date();

        return buildTimeObject(d, false);
    }
}

export default LocalTime;
