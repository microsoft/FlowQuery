/**
 * Shared utility functions for temporal (date/time) operations.
 *
 * These helpers are used by the datetime, date, time, localdatetime,
 * localtime, and timestamp functions.
 */

/**
 * Computes the ISO day of the week (1 = Monday, 7 = Sunday) matching Neo4j convention.
 */
function isoDayOfWeek(d: Date): number {
    const jsDay = d.getDay(); // 0 = Sunday, 6 = Saturday
    return jsDay === 0 ? 7 : jsDay;
}

/**
 * Computes the day of the year (1-based).
 */
function dayOfYear(d: Date): number {
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = d.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

/**
 * Computes the quarter (1-4) from a month (0-11).
 */
function quarter(month: number): number {
    return Math.floor(month / 3) + 1;
}

/**
 * Pads a number to a given width with leading zeros.
 */
function pad(n: number, width: number = 2): string {
    return String(n).padStart(width, "0");
}

/**
 * Formats a timezone offset in ±HH:MM format.
 */
function formatTimezoneOffset(d: Date): string {
    const offset = -d.getTimezoneOffset();
    if (offset === 0) return "Z";
    const sign = offset > 0 ? "+" : "-";
    const absOffset = Math.abs(offset);
    const hours = Math.floor(absOffset / 60);
    const minutes = absOffset % 60;
    return `${sign}${pad(hours)}:${pad(minutes)}`;
}

/**
 * Parses a temporal argument (string or map) into a Date object.
 *
 * @param arg - The argument to parse (string or object with year/month/day/hour/minute/second/millisecond)
 * @param fnName - The calling function name for error messages
 * @returns A Date object
 */
export function parseTemporalArg(arg: any, fnName: string): Date {
    if (typeof arg === "string") {
        const d = new Date(arg);
        if (isNaN(d.getTime())) {
            throw new Error(`${fnName}(): Invalid temporal string: '${arg}'`);
        }
        return d;
    }

    if (typeof arg === "number") {
        // Treat as epoch milliseconds
        return new Date(arg);
    }

    if (typeof arg === "object" && arg !== null && !Array.isArray(arg)) {
        // Map-style construction: {year, month, day, hour, minute, second, millisecond}
        const year = arg.year ?? new Date().getFullYear();
        const month = (arg.month ?? 1) - 1; // JS months are 0-based
        const day = arg.day ?? 1;
        const hour = arg.hour ?? 0;
        const minute = arg.minute ?? 0;
        const second = arg.second ?? 0;
        const millisecond = arg.millisecond ?? 0;
        return new Date(year, month, day, hour, minute, second, millisecond);
    }

    throw new Error(
        `${fnName}(): Expected a string, number (epoch millis), or map argument, got ${typeof arg}`
    );
}

/**
 * Builds a datetime result object with full temporal properties.
 *
 * @param d - The Date object
 * @param utc - If true, use UTC values; if false, use local values
 * @returns An object with year, month, day, hour, minute, second, millisecond,
 *          epochMillis, epochSeconds, dayOfWeek, dayOfYear, quarter, formatted
 */
export function buildDatetimeObject(d: Date, utc: boolean): Record<string, any> {
    const year = utc ? d.getUTCFullYear() : d.getFullYear();
    const month = utc ? d.getUTCMonth() + 1 : d.getMonth() + 1;
    const day = utc ? d.getUTCDate() : d.getDate();
    const hour = utc ? d.getUTCHours() : d.getHours();
    const minute = utc ? d.getUTCMinutes() : d.getMinutes();
    const second = utc ? d.getUTCSeconds() : d.getSeconds();
    const millisecond = utc ? d.getUTCMilliseconds() : d.getMilliseconds();

    const datePart = new Date(year, month - 1, day);

    const formatted = utc
        ? d.toISOString()
        : `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}.${pad(millisecond, 3)}`;

    return {
        year,
        month,
        day,
        hour,
        minute,
        second,
        millisecond,
        epochMillis: d.getTime(),
        epochSeconds: Math.floor(d.getTime() / 1000),
        dayOfWeek: isoDayOfWeek(datePart),
        dayOfYear: dayOfYear(datePart),
        quarter: quarter(month - 1),
        formatted,
    };
}

/**
 * Builds a date result object (no time component).
 *
 * @param d - The Date object
 * @returns An object with year, month, day, epochMillis, dayOfWeek, dayOfYear, quarter, formatted
 */
export function buildDateObject(d: Date): Record<string, any> {
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();

    // Strip time component for epoch calculation
    const dateOnly = new Date(year, month - 1, day);

    return {
        year,
        month,
        day,
        epochMillis: dateOnly.getTime(),
        dayOfWeek: isoDayOfWeek(dateOnly),
        dayOfYear: dayOfYear(dateOnly),
        quarter: quarter(month - 1),
        formatted: `${year}-${pad(month)}-${pad(day)}`,
    };
}

/**
 * Builds a time result object (no date component).
 *
 * @param d - The Date object
 * @param utc - If true, use UTC values; if false, use local values
 * @returns An object with hour, minute, second, millisecond, formatted
 */
export function buildTimeObject(d: Date, utc: boolean): Record<string, any> {
    const hour = utc ? d.getUTCHours() : d.getHours();
    const minute = utc ? d.getUTCMinutes() : d.getMinutes();
    const second = utc ? d.getUTCSeconds() : d.getSeconds();
    const millisecond = utc ? d.getUTCMilliseconds() : d.getMilliseconds();

    const timePart = `${pad(hour)}:${pad(minute)}:${pad(second)}.${pad(millisecond, 3)}`;
    const formatted = utc ? `${timePart}Z` : timePart;

    return {
        hour,
        minute,
        second,
        millisecond,
        formatted,
    };
}
