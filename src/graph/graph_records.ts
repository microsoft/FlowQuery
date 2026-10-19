/**
 * Internal records of entities read from, or written to, the default
 * graph (`USE GRAPH fn($request)`).
 *
 * A default-graph backend returns rows that keep metadata and user
 * properties apart:
 *
 * - nodes: `{ id, labels: [...], properties: {...} }`
 * - relationships: `{ id, type, left_id, right_id, properties: {...} }`
 *
 * FlowQuery binds them as flat records (user properties plus `id`, and
 * `left_id` / `right_id` for relationships) so property access works
 * exactly like for virtual definitions.  Metadata wins in that flat
 * view; the exact stored labels, type and user properties travel in
 * internal keys that are never returned to callers.
 */

/** Marks a record that belongs to the default graph (provenance). */
export const GRAPH_KEY = "_graph";
/** All stored labels of a default-graph node. */
export const LABELS_KEY = "_labels";
/** Exact user properties of a default-graph entity. */
export const PROPERTIES_KEY = "_properties";

let graphRecordsSeen = false;

/** True once any default-graph record was built (enables result cleanup). */
export function graphRecordsInUse(): boolean {
    return graphRecordsSeen;
}

export function isGraphRecord(value: any): boolean {
    return value !== null && typeof value === "object" && value[GRAPH_KEY] === true;
}

/** Common provenance of a list of records: `true`, `false`, or `undefined` when mixed. */
export function commonOrigin(records: Record<string, any>[]): boolean | undefined {
    if (records.length === 0) return undefined;
    const first = isGraphRecord(records[0]);
    for (const record of records) {
        if (isGraphRecord(record) !== first) return undefined;
    }
    return first;
}

/** True when `record` may join a traversal step constrained to `origin`. */
export function originMatches(record: any, origin: boolean | undefined): boolean {
    return origin === undefined || isGraphRecord(record) === origin;
}

export function graphNodeRecord(
    id: any,
    labels: string[],
    properties: Record<string, any>
): Record<string, any> {
    graphRecordsSeen = true;
    return {
        ...properties,
        id,
        [LABELS_KEY]: [...labels],
        [PROPERTIES_KEY]: { ...properties },
        [GRAPH_KEY]: true,
    };
}

export function graphRelationshipRecord(
    id: any,
    type: string,
    leftId: any,
    rightId: any,
    properties: Record<string, any>
): Record<string, any> {
    graphRecordsSeen = true;
    return {
        ...properties,
        id,
        left_id: leftId,
        right_id: rightId,
        _type: type,
        [PROPERTIES_KEY]: { ...properties },
        [GRAPH_KEY]: true,
    };
}

/** Stored labels of a node value (`_labels`, else its matched `_label`). */
export function labelsOf(value: Record<string, any>): string[] {
    const labels = value[LABELS_KEY];
    if (Array.isArray(labels)) return [...labels];
    return value._label ? [value._label] : [];
}

/** User properties of an entity value (exact for default-graph records). */
export function userProperties(value: Record<string, any>): Record<string, any> | undefined {
    const properties = value[PROPERTIES_KEY];
    return properties !== null && typeof properties === "object" ? properties : undefined;
}

function containsGraphRecord(value: any): boolean {
    if (Array.isArray(value)) return value.some(containsGraphRecord);
    if (value !== null && typeof value === "object" && !(value instanceof Date)) {
        if (value[GRAPH_KEY] === true) return true;
        return Object.values(value).some(containsGraphRecord);
    }
    return false;
}

/**
 * A result value without the internal keys of default-graph records:
 * `value` itself when it holds none, otherwise a cleaned deep copy.
 */
export function withoutGraphKeys<T>(value: T): T {
    if (!graphRecordsSeen || !containsGraphRecord(value)) return value;
    return stripGraphKeys(structuredClone(value));
}

/**
 * Remove the internal keys of default-graph records, in place,
 * throughout a result value.  Other values are left untouched.
 */
export function stripGraphKeys(value: any): any {
    if (!graphRecordsSeen) return value;
    if (Array.isArray(value)) {
        for (const item of value) stripGraphKeys(item);
        return value;
    }
    if (value !== null && typeof value === "object" && !(value instanceof Date)) {
        if (value[GRAPH_KEY] === true) {
            delete value[GRAPH_KEY];
            delete value[LABELS_KEY];
            delete value[PROPERTIES_KEY];
            delete value._label;
            delete value._type;
        }
        for (const key of Object.keys(value)) stripGraphKeys(value[key]);
    }
    return value;
}
