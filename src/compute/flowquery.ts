import Database from "../graph/database";
import {
    NodeSourceCapabilities,
    NodeSourceProvider,
    RelationshipSourceCapabilities,
    RelationshipSourceProvider,
} from "../graph/source_provider";
import Function from "../parsing/functions/function";
import { FunctionMetadata } from "../parsing/functions/function_metadata";
import Runner from "./runner";

const warned = new Set<string>();

/** Log a deprecation warning once per process for `api`. */
function deprecated(api: string): void {
    if (warned.has(api)) return;
    warned.add(api);
    console.warn(
        `FlowQuery: ${api} is deprecated and will be removed in the next major release; ` +
            "define backend-aware sources with CREATE VIRTUAL ... WITH CAPABILITIES { ... } AS { ... } instead."
    );
}

/**
 * FlowQuery is the public API surface for the FlowQuery library.
 *
 * It extends {@link Runner} with extensibility features such as function
 * listing and plugin registration, keeping the Runner focused on execution.
 *
 * The static members are assigned dynamically in
 * {@link ../index.browser.ts | index.browser.ts} and
 * {@link ../index.node.ts | index.node.ts}.
 *
 * @example
 * ```typescript
 * const fq = new FlowQuery("WITH 1 as x RETURN x");
 * await fq.run();
 * console.log(fq.results); // [{ x: 1 }]
 *
 * // List all registered functions
 * const functions = FlowQuery.listFunctions();
 * ```
 */
class FlowQuery extends Runner {
    /**
     * List all registered functions with their metadata.
     */
    static listFunctions: (options?: {
        category?: string;
        asyncOnly?: boolean;
        syncOnly?: boolean;
    }) => FunctionMetadata[];

    /**
     * Get metadata for a specific function.
     */
    static getFunctionMetadata: (name: string) => FunctionMetadata | undefined;

    /**
     * Base Function class for creating custom plugin functions.
     */
    static Function: typeof Function;

    /**
     * Register a backend-aware node source for `label` (replacing any
     * existing virtual definition).  See `NodeSourceProvider`.
     *
     * @deprecated Use `CREATE VIRTUAL (:Label) WITH CAPABILITIES { ... } AS { ... }`
     * over an async function instead.  Removed in the next major release.
     */
    static registerNodeSource(label: string, provider: NodeSourceProvider): void {
        deprecated("FlowQuery.registerNodeSource");
        Database.getInstance().registerNodeSource(label, provider);
    }

    /**
     * Register a backend-aware relationship source for
     * `(:sourceLabel)-[:type]->(:targetLabel)`.  See `RelationshipSourceProvider`.
     *
     * @deprecated Use `CREATE VIRTUAL (:A)-[:TYPE]-(:B) WITH CAPABILITIES { ... } AS { ... }`
     * instead.  Removed in the next major release.
     */
    static registerRelationshipSource(
        type: string,
        sourceLabel: string | null,
        targetLabel: string | null,
        provider: RelationshipSourceProvider
    ): void {
        deprecated("FlowQuery.registerRelationshipSource");
        Database.getInstance().registerRelationshipSource(type, sourceLabel, targetLabel, provider);
    }

    /**
     * Opt a `CREATE VIRTUAL (:label) AS { ... }` definition into the source
     * contract with explicit capabilities, or pass `null` to opt out.
     *
     * @deprecated Declare capabilities with `WITH CAPABILITIES { ... }` (or on
     * the async function) instead.  Removed in the next major release.
     */
    static setNodeSourceCapabilities(
        label: string,
        capabilities: NodeSourceCapabilities | null
    ): void {
        deprecated("FlowQuery.setNodeSourceCapabilities");
        Database.getInstance().setNodeSourceCapabilities(label, capabilities);
    }

    /**
     * Relationship counterpart of {@link FlowQuery.setNodeSourceCapabilities}.
     *
     * @deprecated Declare capabilities with `WITH CAPABILITIES { ... }` (or on
     * the async function) instead.  Removed in the next major release.
     */
    static setRelationshipSourceCapabilities(
        type: string,
        sourceLabel: string | null,
        targetLabel: string | null,
        capabilities: RelationshipSourceCapabilities | null
    ): void {
        deprecated("FlowQuery.setRelationshipSourceCapabilities");
        Database.getInstance().setRelationshipSourceCapabilities(
            type,
            sourceLabel,
            targetLabel,
            capabilities
        );
    }
}

export default FlowQuery;
