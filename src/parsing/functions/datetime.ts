import Function from "./function";
import { FunctionDef } from "./function_metadata";
import { buildDatetimeObject, parseTemporalArg } from "./temporal_utils";

/**
 * Returns a datetime value (date + time + timezone offset).
 * When called with no arguments, returns the current UTC datetime.
 * When called with a string argument, parses it as an ISO 8601 datetime.
 * When called with a map argument, constructs a datetime from components.
 *
 * Equivalent to Neo4j's datetime() function.
 *
 * @example
 * ```
 * RETURN datetime() AS now
 * RETURN datetime('2025-06-15T12:30:00Z') AS dt
 * RETURN datetime({year: 2025, month: 6, day: 15}) AS dt
 * ```
 */
@FunctionDef({
    description:
        "Returns a datetime value. With no arguments returns the current UTC datetime. " +
        "Accepts an ISO 8601 string or a map of components (year, month, day, hour, minute, second, millisecond).",
    category: "scalar",
    parameters: [
        {
            name: "input",
            description: "Optional. An ISO 8601 datetime string or a map of components.",
            type: "string",
            required: false,
        },
    ],
    output: {
        description:
            "A datetime object with properties: year, month, day, hour, minute, second, millisecond, " +
            "epochMillis, epochSeconds, dayOfWeek, dayOfYear, quarter, formatted",
        type: "object",
    },
    examples: [
        "RETURN datetime() AS now",
        "RETURN datetime('2025-06-15T12:30:00Z') AS dt",
        "RETURN datetime({year: 2025, month: 6, day: 15, hour: 12}) AS dt",
        "WITH datetime() AS dt RETURN dt.year, dt.month, dt.day",
    ],
})
class Datetime extends Function {
    constructor() {
        super("datetime");
        this._expectedParameterCount = null;
    }

    public value(): any {
        const children = this.getChildren();
        if (children.length > 1) {
            throw new Error("datetime() accepts at most one argument");
        }

        const d: Date =
            children.length === 1 ? parseTemporalArg(children[0].value(), "datetime") : new Date();

        return buildDatetimeObject(d, true);
    }
}

export default Datetime;
