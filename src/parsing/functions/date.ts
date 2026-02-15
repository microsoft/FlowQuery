import Function from "./function";
import { FunctionDef } from "./function_metadata";
import { buildDateObject, parseTemporalArg } from "./temporal_utils";

/**
 * Returns a date value (no time component).
 * When called with no arguments, returns the current date.
 * When called with a string argument, parses it as an ISO 8601 date.
 * When called with a map argument, constructs a date from components.
 *
 * @example
 * ```
 * RETURN date() AS today
 * RETURN date('2025-06-15') AS d
 * RETURN date({year: 2025, month: 6, day: 15}) AS d
 * ```
 */
@FunctionDef({
    description:
        "Returns a date value. With no arguments returns the current date. " +
        "Accepts an ISO 8601 date string or a map of components (year, month, day).",
    category: "scalar",
    parameters: [
        {
            name: "input",
            description: "Optional. An ISO 8601 date string (YYYY-MM-DD) or a map of components.",
            type: "string",
            required: false,
        },
    ],
    output: {
        description:
            "A date object with properties: year, month, day, " +
            "epochMillis, dayOfWeek, dayOfYear, quarter, formatted",
        type: "object",
    },
    examples: [
        "RETURN date() AS today",
        "RETURN date('2025-06-15') AS d",
        "RETURN date({year: 2025, month: 6, day: 15}) AS d",
        "WITH date() AS d RETURN d.year, d.month, d.dayOfWeek",
    ],
})
class DateFunction extends Function {
    constructor() {
        super("date");
        this._expectedParameterCount = null;
    }

    public value(): any {
        const children = this.getChildren();
        if (children.length > 1) {
            throw new Error("date() accepts at most one argument");
        }

        const d: Date =
            children.length === 1 ? parseTemporalArg(children[0].value(), "date") : new Date();

        return buildDateObject(d);
    }
}

export default DateFunction;
