import Function from "./function";
import { FunctionDef } from "./function_metadata";
import { buildDatetimeObject, parseTemporalArg } from "./temporal_utils";

/**
 * Returns a local datetime value (date + time, no timezone offset).
 * When called with no arguments, returns the current local datetime.
 * When called with a string argument, parses it as an ISO 8601 datetime.
 * When called with a map argument, constructs a datetime from components.
 *
 * Equivalent to Neo4j's localdatetime() function.
 *
 * @example
 * ```
 * RETURN localdatetime() AS now
 * RETURN localdatetime('2025-06-15T12:30:00') AS dt
 * ```
 */
@FunctionDef({
    description:
        "Returns a local datetime value (no timezone). With no arguments returns the current local datetime. " +
        "Accepts an ISO 8601 string or a map of components.",
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
        "RETURN localdatetime() AS now",
        "RETURN localdatetime('2025-06-15T12:30:00') AS dt",
        "WITH localdatetime() AS dt RETURN dt.hour, dt.minute",
    ],
})
class LocalDatetime extends Function {
    constructor() {
        super("localdatetime");
        this._expectedParameterCount = null;
    }

    public value(): any {
        const children = this.getChildren();
        if (children.length > 1) {
            throw new Error("localdatetime() accepts at most one argument");
        }

        const d: Date =
            children.length === 1
                ? parseTemporalArg(children[0].value(), "localdatetime")
                : new Date();

        return buildDatetimeObject(d, false);
    }
}

export default LocalDatetime;
