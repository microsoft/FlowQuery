/**
 * Internal records of entities read from, or written to, a graph bound
 * with `USE GRAPH [name =] fn($request)`.
 *
 * A graph backend returns rows that keep metadata and user
 * properties apart:
 *
 * - nodes: `{ id, labels: [...], properties: {...} }`
 * - relationships: `{ id, type, left_id, right_id, properties: {...} }`
 *
 * FlowQuery binds them as records whose `id` (and `left_id` / `right_id`
 * for relationships) is the entity's identity, used for traversal.  User
 * properties travel separately, in an internal key: property access
 * (`n.name`, `n.id`, `{key: ...}` constraints) always reads the stored
 * user properties, as in Cypher, and the identity is read with `id(n)`.
 * Internal keys are never returned to callers.
 */

/** The graph bound with an unnamed `USE GRAPH` (also `USE GRAPH default = ...`). */
export const DEFAULT_GRAPH = "default";
/**
 * Namespace of `CREATE VIRTUAL` definition entities.  Reserved: no graph
 * can be bound under this name.
 */
export const VIRTUAL_NAMESPACE = "virtual";

/** Name of the graph a record belongs to (absent for definition records). */
export const GRAPH_KEY = "_graph";
/** All stored labels of a graph node. */
export const LABELS_KEY = "_labels";
/** Exact user properties of a graph entity. */
export const PROPERTIES_KEY = "_properties";
/** Namespace of a relationship's left endpoint, when it differs from the relationship's. */
export const LEFT_NAMESPACE_KEY = "_leftGraph";
/** Namespace of a relationship's right endpoint, when it differs from the relationship's. */
export const RIGHT_NAMESPACE_KEY = "_rightGraph";

let graphRecordsSeen = false;

/** True once any graph record was built (enables result cleanup). */
export function graphRecordsInUse(): boolean {
    return graphRecordsSeen;
}

export function isGraphRecord(value: any): boolean {
    return value !== null && typeof value === "object" && typeof value[GRAPH_KEY] === "string";
}

/**
 * Namespace of an entity: the name of the graph it was read from or
 * written to, or {@link VIRTUAL_NAMESPACE} for definition entities.
 * Ids are only meaningful within their namespace.
 */
export function namespaceOf(record: any): string {
    return isGraphRecord(record) ? record[GRAPH_KEY] : VIRTUAL_NAMESPACE;
}

/** Namespace of the node at the `side` endpoint of a relationship record. */
export function endpointNamespace(record: any, side: "left" | "right"): string {
    const key = side === "left" ? LEFT_NAMESPACE_KEY : RIGHT_NAMESPACE_KEY;
    const ns = record !== null && typeof record === "object" ? record[key] : undefined;
    return typeof ns === "string" ? ns : namespaceOf(record);
}

/** Common value of `of` over `records`, or `undefined` when empty or mixed. */
export function commonNamespace<T>(records: T[], of: (record: T) => string): string | undefined {
    if (records.length === 0) return undefined;
    const first = of(records[0]);
    for (const record of records) {
        if (of(record) !== first) return undefined;
    }
    return first;
}

/** Common namespace of node records. */
export function commonOrigin(records: Record<string, any>[]): string | undefined {
    return commonNamespace(records, namespaceOf);
}

/** True when node `record` may join a traversal step constrained to namespace `origin`. */
export function originMatches(record: any, origin: string | undefined): boolean {
    return origin === undefined || namespaceOf(record) === origin;
}

/** True when the `side` endpoint of relationship `record` is in namespace `origin`. */
export function endpointMatches(
    record: any,
    side: "left" | "right",
    origin: string | undefined
): boolean {
    return origin === undefined || endpointNamespace(record, side) === origin;
}

/**
 * Tag a definition relationship row with the namespaces of its endpoints
 * when they are graphs (definition endpoints default to definitions).
 */
export function withEndpointNamespaces(
    row: Record<string, any>,
    left: string,
    right: string
): Record<string, any> {
    if (left === VIRTUAL_NAMESPACE && right === VIRTUAL_NAMESPACE) return row;
    const out = { ...row };
    if (left !== VIRTUAL_NAMESPACE) out[LEFT_NAMESPACE_KEY] = left;
    if (right !== VIRTUAL_NAMESPACE) out[RIGHT_NAMESPACE_KEY] = right;
    return out;
}

export function graphNodeRecord(
    id: any,
    labels: string[],
    properties: Record<string, any>,
    graph: string = DEFAULT_GRAPH
): Record<string, any> {
    graphRecordsSeen = true;
    return {
        ...properties,
        id,
        [LABELS_KEY]: [...labels],
        [PROPERTIES_KEY]: { ...properties },
        [GRAPH_KEY]: graph,
    };
}

export function graphRelationshipRecord(
    id: any,
    type: string,
    leftId: any,
    rightId: any,
    properties: Record<string, any>,
    graph: string = DEFAULT_GRAPH,
    leftGraph: string = graph,
    rightGraph: string = graph
): Record<string, any> {
    graphRecordsSeen = true;
    const record: Record<string, any> = {
        ...properties,
        id,
        left_id: leftId,
        right_id: rightId,
        _type: type,
        [PROPERTIES_KEY]: { ...properties },
        [GRAPH_KEY]: graph,
    };
    if (leftGraph !== graph) record[LEFT_NAMESPACE_KEY] = leftGraph;
    if (rightGraph !== graph) record[RIGHT_NAMESPACE_KEY] = rightGraph;
    return record;
}

/** Stored labels of a node value (`_labels`, else its matched `_label`). */
export function labelsOf(value: Record<string, any>): string[] {
    const labels = value[LABELS_KEY];
    if (Array.isArray(labels)) return [...labels];
    return value._label ? [value._label] : [];
}

/** A user property of an entity: the stored property for graph records, else the column. */
export function propertyOf(record: Record<string, any>, key: string): any {
    if (isGraphRecord(record)) {
        const properties = userProperties(record);
        return properties !== undefined && key in properties ? properties[key] : undefined;
    }
    return record[key];
}

/** The entity has user property (or column) `key`. */
export function hasProperty(record: Record<string, any>, key: string): boolean {
    if (isGraphRecord(record)) {
        const properties = userProperties(record);
        return properties !== undefined && key in properties;
    }
    return key in record;
}

/** User properties of an entity value (exact for graph records). */
export function userProperties(value: Record<string, any>): Record<string, any> | undefined {
    const properties = value[PROPERTIES_KEY];
    return properties !== null && typeof properties === "object" ? properties : undefined;
}

function containsGraphRecord(value: any): boolean {
    if (Array.isArray(value)) return value.some(containsGraphRecord);
    if (value !== null && typeof value === "object" && !(value instanceof Date)) {
        if (isGraphRecord(value)) return true;
        return Object.values(value).some(containsGraphRecord);
    }
    return false;
}

/**
 * A result value without the internal keys of graph records:
 * `value` itself when it holds none, otherwise a cleaned deep copy.
 */
export function withoutGraphKeys<T>(value: T): T {
    if (!graphRecordsSeen || !containsGraphRecord(value)) return value;
    return stripGraphKeys(structuredClone(value));
}

const RELATIONSHIP_ENVELOPE = ["type", "startNode", "endNode", "properties"] as const;

/**
 * Rewrite a graph entity, in place, as returned to callers: its stored
 * user properties, plus `id` (the entity id) unless the entity stores a
 * property of that name; `id(n)` always returns the entity id.
 * Relationship values keep their `type` / `startNode` / `endNode` /
 * `properties` envelope.
 */
function publicView(value: Record<string, any>): void {
    const id = value.id;
    const stored = userProperties(value) ?? {};
    const relationship = RELATIONSHIP_ENVELOPE.every((key) => key in value);
    const envelope: Record<string, any> = {};
    if (relationship) {
        for (const key of RELATIONSHIP_ENVELOPE) envelope[key] = value[key];
    }
    for (const key of Object.keys(value)) delete value[key];
    Object.assign(value, stored);
    if (!("id" in stored) && id !== undefined) value.id = id;
    Object.assign(value, envelope);
}

/**
 * Remove the internal keys of graph records, in place,
 * throughout a result value.  Other values are left untouched.
 */
export function stripGraphKeys(value: any): any {
    if (!graphRecordsSeen) return value;
    if (Array.isArray(value)) {
        for (const item of value) stripGraphKeys(item);
        return value;
    }
    if (value !== null && typeof value === "object" && !(value instanceof Date)) {
        if (isGraphRecord(value)) {
            publicView(value);
        }
        for (const key of Object.keys(value)) stripGraphKeys(value[key]);
    }
    return value;
}
