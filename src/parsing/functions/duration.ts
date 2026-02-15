import Function from "./function";
import { FunctionDef } from "./function_metadata";

/**
 * Regex for ISO 8601 duration strings: P[nY][nM][nW][nD][T[nH][nM][nS]]
 */
const ISO_DURATION_REGEX =
    /^P(?:(\d+(?:\.\d+)?)Y)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)W)?(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;

function parseDurationString(s: string): Record<string, number> {
    const match = s.match(ISO_DURATION_REGEX);
    if (!match) {
        throw new Error(`duration(): Invalid ISO 8601 duration string: '${s}'`);
    }
    return {
        years: match[1] ? parseFloat(match[1]) : 0,
        months: match[2] ? parseFloat(match[2]) : 0,
        weeks: match[3] ? parseFloat(match[3]) : 0,
        days: match[4] ? parseFloat(match[4]) : 0,
        hours: match[5] ? parseFloat(match[5]) : 0,
        minutes: match[6] ? parseFloat(match[6]) : 0,
        seconds: match[7] ? parseFloat(match[7]) : 0,
    };
}

function buildDurationObject(components: Record<string, number>): Record<string, any> {
    const years = components.years || 0;
    const months = components.months || 0;
    const weeks = components.weeks || 0;
    const days = components.days || 0;
    const hours = components.hours || 0;
    const minutes = components.minutes || 0;
    const seconds = Math.floor(components.seconds || 0);
    const fractionalSeconds = (components.seconds || 0) - seconds;

    const milliseconds = components.milliseconds
        ? Math.floor(components.milliseconds)
        : Math.round(fractionalSeconds * 1000);

    const nanoseconds = components.nanoseconds
        ? Math.floor(components.nanoseconds)
        : Math.round(fractionalSeconds * 1_000_000_000) % 1_000_000;

    // Total days including weeks
    const totalDays = days + weeks * 7;

    // Total seconds for the time portion
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;

    // Approximate total in various units (months approximated at 30 days)
    const totalMonths = years * 12 + months;

    // Build ISO 8601 formatted string
    let formatted = "P";
    if (years) formatted += `${years}Y`;
    if (months) formatted += `${months}M`;
    if (weeks) formatted += `${weeks}W`;
    if (totalDays - weeks * 7) formatted += `${totalDays - weeks * 7}D`;
    const hasTime = hours || minutes || seconds || milliseconds;
    if (hasTime) {
        formatted += "T";
        if (hours) formatted += `${hours}H`;
        if (minutes) formatted += `${minutes}M`;
        if (seconds || milliseconds) {
            if (milliseconds) {
                formatted += `${seconds}.${String(milliseconds).padStart(3, "0")}S`;
            } else {
                formatted += `${seconds}S`;
            }
        }
    }
    if (formatted === "P") formatted = "PT0S";

    return {
        years,
        months,
        weeks,
        days: totalDays,
        hours,
        minutes,
        seconds,
        milliseconds,
        nanoseconds,
        totalMonths,
        totalDays,
        totalSeconds,
        formatted,
    };
}

@FunctionDef({
    description:
        "Creates a duration value representing a span of time. " +
        "Accepts an ISO 8601 duration string (e.g., 'P1Y2M3DT4H5M6S') or a map of components " +
        "(years, months, weeks, days, hours, minutes, seconds, milliseconds, nanoseconds).",
    category: "scalar",
    parameters: [
        {
            name: "input",
            description:
                "An ISO 8601 duration string or a map of components (years, months, weeks, days, hours, minutes, seconds, milliseconds, nanoseconds)",
            type: "any",
        },
    ],
    output: {
        description:
            "A duration object with properties: years, months, weeks, days, hours, minutes, seconds, " +
            "milliseconds, nanoseconds, totalMonths, totalDays, totalSeconds, formatted",
        type: "object",
    },
    examples: [
        "RETURN duration('P1Y2M3D') AS d",
        "RETURN duration('PT2H30M') AS d",
        "RETURN duration({days: 14, hours: 16}) AS d",
        "RETURN duration({months: 5, days: 1, hours: 12}) AS d",
    ],
})
class Duration extends Function {
    constructor() {
        super("duration");
        this._expectedParameterCount = 1;
    }

    public value(): any {
        const arg = this.getChildren()[0].value();
        if (arg === null || arg === undefined) {
            return null;
        }

        if (typeof arg === "string") {
            const components = parseDurationString(arg);
            return buildDurationObject(components);
        }

        if (typeof arg === "object" && !Array.isArray(arg)) {
            return buildDurationObject(arg);
        }

        throw new Error("duration() expects a string or map argument");
    }
}

export default Duration;
