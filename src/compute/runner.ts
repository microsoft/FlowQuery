import Bindings from "../graph/bindings";
import DataCache from "../graph/data_cache";
import DataResolver from "../graph/data_resolver";
import Database from "../graph/database";
import Node from "../graph/node";
import Pattern from "../graph/pattern";
import Relationship from "../graph/relationship";
import SourceContext, {
    SourceOptions,
    SourceStats,
    emptySourceStats,
} from "../graph/source_context";
import { INNER_SOURCE_CONTEXT } from "../graph/virtual_statement";
import { WriteResult, replaceRefs } from "../graph/write_set";
import ASTNode from "../parsing/ast_node";
import BindingReference from "../parsing/expressions/binding_reference";
import ParameterReference from "../parsing/expressions/parameter_reference";
import SubqueryExpression from "../parsing/expressions/subquery_expression";
import AsyncFunction from "../parsing/functions/async_function";
import AggregatedReturn from "../parsing/operations/aggregated_return";
import AggregatedWith from "../parsing/operations/aggregated_with";
import CreateNode from "../parsing/operations/create_node";
import CreateRelationship from "../parsing/operations/create_relationship";
import { referencesRequest } from "../parsing/operations/definition_backend";
import DeleteNode from "../parsing/operations/delete_node";
import DeleteRelationship from "../parsing/operations/delete_relationship";
import Load from "../parsing/operations/load";
import Match from "../parsing/operations/match";
import Operation from "../parsing/operations/operation";
import Return from "../parsing/operations/return";
import Union from "../parsing/operations/union";
import { DropGraph, UseGraph } from "../parsing/operations/use_graph";
import {
    WriteOperation,
    commitWrites,
    flushWrites,
    prepareWrites,
    rollbackWrites,
} from "../parsing/operations/write";
import Parser from "../parsing/parser";
import StatementInfoCrawler, {
    ColumnLineage,
    ColumnReference,
    StatementInfo,
} from "../parsing/statement_info_crawler";
import {
    DataSourceBinding,
    NodeBinding,
    ProvenanceSites,
    ProvenanceSource,
    RelationshipBinding,
    RowProvenance,
} from "./provenance";

export type {
    ColumnLineage,
    ColumnReference,
    StatementInfo,
} from "../parsing/statement_info_crawler";
export type {
    DataSourceBinding,
    NodeBinding,
    RelationshipBinding,
    RelationshipHop,
    RowProvenance,
} from "./provenance";

/**
 * One slice of runtime provenance that contributed to a result cell.
 * Pairs the column's `ColumnReference` (i.e. `alias.property`) with the
 * matching node or relationship binding from the row provenance.
 */
export interface CellBindingTrace {
    /** The `alias.property` reference from `ColumnLineage.references` that this binding satisfies. */
    reference: ColumnReference;
    /**
     * The observed value of `reference.property` on the matched
     * record.
     *
     * - For nodes: `node.id` when `reference.property === 'id'`,
     *   otherwise `node.properties?.[reference.property]`.
     * - For relationships: built-ins (`left_id`, `right_id`, `type`)
     *   come from `hops[0]` directly; everything else comes from
     *   `hops[0].properties`.  For variable-length matches over
     *   heterogeneous edges, inspect `relationship.hops` to see
     *   per-hop values.
     *
     * `undefined` when the binding doesn't carry that property (e.g.
     * an OPTIONAL MATCH miss).
     */
    value: any;
    /** Present when `reference.kind === 'node'`. */
    node?: NodeBinding;
    /** Present when `reference.kind === 'relationship'`. */
    relationship?: RelationshipBinding;
}

/**
 * Combined lineage and provenance for a single result cell.  Bundles
 * the structural lineage from `metadata.info.returns[column]` with the
 * runtime bindings from `provenance[rowIndex]` that contributed to the
 * cell.  Produced by {@link Runner.traceRow} and {@link Runner.lineage}.
 */
export interface CellTrace {
    /** The output column name. */
    column: string;
    /** The cell value (`results[rowIndex][column]`). */
    value: any;
    /**
     * Structural lineage for the column, copied from
     * `metadata.info.returns[column]`.  `null` when the column has no
     * recorded structural info (e.g. unusual statement shapes that
     * don't surface a `RETURN` to the crawler).
     */
    lineage: ColumnLineage | null;
    /**
     * One entry per matching `(reference, binding)` pair for this row.
     * Aggregate columns may have many entries (one per input row that
     * fed the group); non-aggregate columns typically have one per
     * distinct reference.
     *
     * Empty when the column is a literal, when the runner was not
     * constructed with `{ provenance: true }`, or when no row binding
     * matches the column's references.
     */
    bindings: CellBindingTrace[];
}

/**
 * Combined structural lineage and per-row provenance for an entire
 * Runner execution.  Produced by {@link Runner.lineage}.
 */
export interface LineageReport {
    /**
     * Structural per-column lineage; deep copy of
     * `metadata.info?.returns ?? {}`.
     */
    columns: Record<string, ColumnLineage>;
    /**
     * One `{column → CellTrace}` map per result row, aligned by index
     * with `results`.  Each `CellTrace` already pairs the structural
     * lineage with any matching row bindings.
     */
    rows: Record<string, CellTrace>[];
}

/**
 * Optional configuration for a {@link Runner} or {@link FlowQuery}
 * invocation.
 */
export interface RunnerOptions {
    /**
     * When `true`, the runner records row-level data lineage alongside the
     * results: for each emitted row, which concrete node ids and
     * relationship `(left_id, right_id, type)` hops were bound while the
     * row was being projected.  Access via {@link Runner.provenance}.
     *
     * Each {@link NodeBinding} and {@link RelationshipHop} also carries:
     *
     * - `properties`: a shallow copy of the matched record's user-visible
     *   property values.
     * - `source`: when the record came from a `CREATE VIRTUAL (:X) AS
     *   { ... }` sub-query, the inner runner's `RowProvenance` row that
     *   produced it.  Recursive — a virtual that matches another virtual
     *   carries nested `source` chains.
     *
     * Defaults to `false`; when disabled the runner has zero provenance
     * overhead.
     */
    provenance?: boolean;
    /**
     * Tuning for backend-aware virtual sources (definitions declared with
     * `WITH CAPABILITIES` or by their backend function): page size, batch
     * size, cache capacity, start-point reordering and an external
     * cancellation `signal`.  Ignored by eager definitions.
     */
    sources?: SourceOptions;
    /**
     * Named query parameters.  In a top-level query `$name` resolves to
     * `parameters[name]` (a missing value is an error when the query
     * runs).  Inside virtual definitions `$args` and `$request` keep their
     * meaning and other names fall back to these parameters.
     */
    parameters?: Record<string, any>;
}

/**
 * Metadata about the operations performed by a Runner execution.
 *
 * The four counters track CREATE/DELETE VIRTUAL operations. The optional
 * `info` field carries deeper structural information about the statement(s)
 * — labels, relationship types, sources, and properties — produced by
 * {@link StatementInfoCrawler}.
 */
export interface RunnerMetadata {
    virtual_nodes_created: number;
    virtual_relationships_created: number;
    virtual_nodes_deleted: number;
    virtual_relationships_deleted: number;
    /**
     * Optional structural info produced by walking the parsed statement(s).
     * Populated by the Runner whenever metadata is requested.
     */
    info?: StatementInfo;
}

interface ParsedStatement {
    ast: ASTNode;
    first: Operation;
    last: Operation;
}

/**
 * Executes a FlowQuery statement and retrieves the results.
 *
 * The Runner class parses a FlowQuery statement into an AST and executes it,
 * managing the execution flow from the first operation to the final return statement.
 *
 * Supports multi-statement queries separated by semicolons. Only CREATE and DELETE
 * statements may appear before the last statement. If a retrieval statement is present,
 * it must be the last statement.
 *
 * @example
 * ```typescript
 * const runner = new Runner("WITH 1 as x RETURN x");
 * await runner.run();
 * console.log(runner.results); // [{ x: 1 }]
 * console.log(runner.metadata); // { virtual_nodes_created: 0, ... }
 * ```
 */
class Runner {
    private _statements: ParsedStatement[];
    private _args: Record<string, any> | null = null;
    private _isTopLevel: boolean;
    private _metadata: RunnerMetadata;
    private _options: RunnerOptions;
    private _provenance: RowProvenance[] | null = null;
    private _sourceContext: SourceContext | null = null;
    private _cancelRequested: boolean = false;
    private _writeResult: WriteResult | null = null;
    private _committedResults: Record<string, any>[] | null = null;

    /**
     * Creates a new Runner instance and parses the FlowQuery statement.
     *
     * @param statement - The FlowQuery statement to execute (may contain semicolon-separated statements)
     * @param ast - An optional pre-parsed AST to use instead of parsing the statement
     * @param args - Optional parameters to inject into $-prefixed parameter references
     * @param options - Optional configuration (e.g. `{ provenance: true }`)
     * @throws {Error} If the statement is null, empty, or contains syntax errors
     */
    constructor(
        statement: string | null = null,
        ast: ASTNode | null = null,
        args: Record<string, any> | null = null,
        options: RunnerOptions = {}
    ) {
        if ((statement === null || statement === "") && ast === null) {
            throw new Error("Either statement or AST must be provided");
        }
        this._args = args;
        this._options = options;

        if (ast !== null) {
            this._isTopLevel = false;
            this._statements = [Runner.toStatement(ast)];
        } else {
            this._isTopLevel = true;
            this._statements = Array.from(
                new Parser().parseStatements(statement!),
                Runner.toStatement
            );
        }

        this._metadata = this.computeMetadata();
    }

    private static toStatement(ast: ASTNode): ParsedStatement {
        return {
            ast,
            first: ast.firstChild() as Operation,
            last: ast.lastChild() as Operation,
        };
    }

    /**
     * Walks all statement ASTs to count CREATE/DELETE operations and to
     * crawl the statements for richer structural info via
     * {@link StatementInfoCrawler}.
     */
    private computeMetadata(): RunnerMetadata {
        const metadata: RunnerMetadata = {
            virtual_nodes_created: 0,
            virtual_relationships_created: 0,
            virtual_nodes_deleted: 0,
            virtual_relationships_deleted: 0,
        };
        for (const stmt of this._statements) {
            let op: Operation | null = stmt.first;
            while (op !== null) {
                if (op instanceof CreateNode) metadata.virtual_nodes_created++;
                else if (op instanceof CreateRelationship) metadata.virtual_relationships_created++;
                else if (op instanceof DeleteNode) metadata.virtual_nodes_deleted++;
                else if (op instanceof DeleteRelationship) metadata.virtual_relationships_deleted++;
                op = op.next;
            }
        }
        metadata.info = new StatementInfoCrawler().crawl(this._statements.map((s) => s.ast));
        return metadata;
    }

    /**
     * Executes the parsed FlowQuery statement(s).
     *
     * @returns A promise that resolves when execution completes
     * @throws {Error} If an error occurs during execution
     */
    public async run(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            const resolver = DataResolver.getInstance();
            const inherited = (this._options as any)[INNER_SOURCE_CONTEXT] as
                | SourceContext
                | null
                | undefined;
            const previousContext = resolver.sourceContext;
            const sink = (this._options as any).rowSink as
                | ((row: Record<string, any>) => Promise<void> | void)
                | undefined;
            const last = this._statements[this._statements.length - 1]?.last;
            let failed = false;
            this._writeResult = null;
            this._committedResults = null;
            try {
                if (this._isTopLevel) {
                    this._sourceContext = new SourceContext(
                        this._options.sources ?? {},
                        this._options.provenance === true
                    );
                    this._sourceContext.parameters = this._options.parameters ?? {};
                    // Pin the default graph for the whole query.
                    this._sourceContext.graph = Database.getInstance().defaultGraph;
                    resolver.dataCache = new DataCache(
                        this._options.provenance === true,
                        this._sourceContext
                    );
                } else {
                    this._sourceContext = inherited ?? previousContext ?? null;
                }
                if (this._cancelRequested) {
                    this._sourceContext?.cancel();
                }
                resolver.sourceContext = this._sourceContext;
                if (this._options.provenance) {
                    this._provenance = [];
                    this.enableProvenance();
                }
                if (sink !== undefined && last instanceof Return) {
                    last.setRowSink(sink);
                }
                for (const stmt of this._statements) {
                    this._sourceContext?.throwIfCancelled();
                    Runner.assignSourceContext(stmt.ast, this._sourceContext);
                    this.bindParameters(stmt.ast);
                    // Refresh any stale refreshable bindings referenced
                    // by this statement.  Sub-query evaluation is
                    // async, but BindingReference.value() is sync;
                    // populating the cache up-front keeps reads cheap
                    // and synchronous.
                    const bindingNames = new Set<string>();
                    this.collectBindingNames(stmt.ast, bindingNames);
                    const bindings = Bindings.getInstance();
                    for (const name of bindingNames) {
                        await bindings.materialize(name);
                    }
                    const writes = WriteOperation.collect(stmt.first);
                    if (writes.length > 0) {
                        if (!this._isTopLevel || this._sourceContext === null) {
                            throw new Error("Write clauses are only allowed in top-level queries");
                        }
                        prepareWrites(stmt.first, this._sourceContext);
                    }
                    await stmt.first.initialize();
                    await stmt.first.run();
                    await stmt.first.finish();
                    // Transactional backends get each statement's changes
                    // before the next statement reads.
                    const pending = this._sourceContext?.writes;
                    if (this._isTopLevel && pending?.transactional && pending.backend !== null) {
                        await flushWrites(this._sourceContext!, pending);
                    }
                }
                await this.commitWrites();
            } catch (e) {
                failed = true;
                const writes = this._isTopLevel ? this._sourceContext?.writes : null;
                if (writes) {
                    await rollbackWrites(this._sourceContext!, writes);
                }
                reject(e);
            } finally {
                if (sink !== undefined && last instanceof Return) {
                    last.setRowSink(null);
                }
                resolver.sourceContext = previousContext;

                if (this._isTopLevel && this._sourceContext !== null) {
                    try {
                        await this._sourceContext.close();
                    } catch (e) {
                        if (!failed) {
                            failed = true;
                            reject(e);
                        }
                    }
                }
            }
            if (!failed) resolve();
        });
    }

    /**
     * Cancel a running (or not yet started) query.  In-flight provider
     * reads are aborted and the query rejects with `QueryCancelledError`.
     */
    public cancel(): void {
        this._cancelRequested = true;
        if (this._isTopLevel) {
            this._sourceContext?.cancel();
        }
    }

    /**
     * Finish the query's writes: send the remaining changes (the whole
     * change set, in one call, for non-transactional backends), commit a
     * transactional query, then replace temporary refs in the results by
     * final ids.  Only runs when every statement succeeded and the query
     * was not cancelled.
     */
    private async commitWrites(): Promise<void> {
        const ctx = this._sourceContext;
        if (!this._isTopLevel || ctx === null || ctx.writes === null) return;
        const writes = ctx.writes;
        if (writes.changes.length === 0 || writes.backend === null) return;
        this._writeResult = await commitWrites(ctx, writes);
        // Aggregating projections rebuild their rows on every read, so keep
        // the rows whose temporary refs were replaced.
        this._committedResults = replaceRefs(this.results, this._writeResult.ids, writes.refs);
    }

    /**
     * Outcome of the last run's write clauses: the change set sent to the
     * backend, the final ids of temporary refs and the backend's stats.
     * `null` when the query wrote nothing.
     */
    public get writeResult(): WriteResult | null {
        return this._writeResult;
    }

    /**
     * Provider interaction counters of the last top-level run: calls,
     * pages, rows, cache hits/misses, batches, materializations,
     * fallbacks, cancellations, peak buffered rows and start-point plans.
     */
    public get sourceStats(): SourceStats {
        return this._sourceContext?.stats ?? emptySourceStats();
    }

    private static assignSourceContext(node: ASTNode, ctx: SourceContext | null): void {
        if (node instanceof Match) {
            node.sourceContext = ctx;
        } else if (node instanceof AsyncFunction) {
            node.sourceContext = ctx;
        } else if (node instanceof WriteOperation) {
            node.sourceContext = ctx;
        } else if (node instanceof UseGraph || node instanceof DropGraph) {
            node.sourceContext = ctx;
        }
        for (const child of node.getChildren()) {
            Runner.assignSourceContext(child, ctx);
        }
    }

    /**
     * Walks the terminal statement's operation chain and wires every
     * MATCH-bound `Node` / `Relationship` slot to the operation that
     * will project it.  Aggregation boundaries (`AggregatedWith`,
     * `AggregatedReturn`) absorb upstream sites into their group-level
     * accumulation; aggregations downstream of one another chain via
     * each `AggregatedWith` re-exposing itself as a provenance source
     * for the next consumer.
     *
     * Only the last statement may produce rows; preceding statements
     * are limited to CREATE / DELETE / REFRESH / DROP and never need
     * row-level provenance.
     */
    private enableProvenance(): void {
        if (this._statements.length === 0) return;
        const stmt = this._statements[this._statements.length - 1];
        Runner.wireProvenance(stmt.first, this._provenance!);
    }

    /**
     * Walk `first..terminal`, accumulating live MATCH sites into the
     * "active" source list and handing it off at every aggregation
     * boundary.  Each `AggregatedWith` consumes the active list and then
     * re-publishes itself as the single active source going forward.
     * `Load` operations contribute per-row data-source bindings.
     *
     * Exposed as a public static so other components (e.g. `Let` when
     * running a sub-query right-hand side) can wire provenance for an
     * operation chain they drive directly, without going through the
     * full `Runner.run` lifecycle.
     */
    public static wireProvenance(first: Operation, sink: RowProvenance[]): void {
        const makeSites = (): ProvenanceSites => {
            const s = new ProvenanceSites();
            s.captureProperties = true;
            return s;
        };
        let activeSites: ProvenanceSites = makeSites();
        // Extra (non-site) sources contributed by upstream aggregations.
        let activeAggregations: AggregatedWith[] = [];
        // Per-row `Load` operations contributing data-source bindings.
        let activeLoads: ProvenanceSource[] = [];
        let op: Operation | null = first;
        let terminal: Operation | null = null;
        while (op !== null) {
            if (op instanceof Match) {
                for (const pattern of op.patterns) {
                    Runner.collectSitesFromPattern(pattern, activeSites);
                }
            } else if (op instanceof Load) {
                activeLoads.push(op.asProvenanceSource());
            } else if (op instanceof AggregatedWith) {
                // Aggregation boundary: hand off current sources and
                // re-publish the aggregation as the new source.
                if (!activeSites.isEmpty) {
                    op.addProvenanceSource(activeSites);
                }
                for (const a of activeAggregations) {
                    op.addProvenanceSource(a.asProvenanceSource());
                }
                for (const l of activeLoads) {
                    op.addProvenanceSource(l);
                }
                activeSites = makeSites();
                activeAggregations = [op];
                activeLoads = [];
            }
            if (op.next === null) {
                terminal = op;
            }
            op = op.next;
        }
        if (terminal === null) return;
        if (terminal instanceof Union) {
            // UNION composes results from two independent sub-pipelines;
            // wire each branch separately and let Union merge.
            const leftSink: RowProvenance[] = [];
            const rightSink: RowProvenance[] = [];
            Runner.wireProvenance(terminal.left, leftSink);
            Runner.wireProvenance(terminal.right, rightSink);
            terminal.enableProvenance(leftSink, rightSink, sink);
            return;
        }
        if (terminal instanceof Return) {
            // AggregatedReturn folds sources into its GroupBy; plain Return
            // snapshots them per emitted row.  Both share the same source
            // registration API.  We always enable the sink so even
            // source-less queries (`WITH ... RETURN`) emit one
            // `{nodes:[], relationships:[]}` per result row for shape
            // consistency with the results array.
            if (!activeSites.isEmpty) {
                terminal.addProvenanceSource(activeSites);
            }
            for (const a of activeAggregations) {
                terminal.addProvenanceSource(a.asProvenanceSource());
            }
            for (const l of activeLoads) {
                terminal.addProvenanceSource(l);
            }
            terminal.enableProvenance(sink);
        }
    }

    private static collectSitesFromPattern(pattern: Pattern, sites: ProvenanceSites): void {
        for (const element of pattern.chain) {
            if (element instanceof Node) {
                sites.addNode(element);
            } else if (element instanceof Relationship) {
                sites.addRelationship(element);
            }
        }
    }

    /**
     * Recursively walks the AST to bind ParameterReference nodes.
     *
     * Inside virtual definitions `$args` resolves to the pass-down args
     * map, `$request` to the source request and `$name` to `args[name]`,
     * falling back to the enclosing query's parameters.  Elsewhere `$name`
     * resolves from `RunnerOptions.parameters` (inherited by nested
     * sub-query runners); a missing value is an error.
     */
    private bindParameters(node: ASTNode): void {
        if (node instanceof UseGraph) {
            // `$request` is a placeholder filled per backend request.
            for (const child of node.function.getChildren()) {
                if (!referencesRequest(child)) this.bindParameters(child);
            }
            return;
        }
        if (node instanceof ParameterReference) {
            node.parameterValue = this.resolveParameter(node);
        }
        for (const child of node.getChildren()) {
            this.bindParameters(child);
        }
        for (const child of Runner.offTreeChildren(node)) {
            this.bindParameters(child);
        }
    }

    /**
     * AST nodes evaluated with the statement but held outside the child
     * list: MATCH patterns, pattern elements, their property constraints
     * and sub-query bodies.
     */
    private static offTreeChildren(node: ASTNode): ASTNode[] {
        if (node instanceof Match) return node.patterns;
        if (node instanceof Pattern) return node.chain;
        if (node instanceof Node || node instanceof Relationship) {
            return Array.from(node.properties.values());
        }
        if (node instanceof SubqueryExpression) return [node.subquery];
        if (node instanceof WriteOperation) return node.evaluated;
        return [];
    }

    private resolveParameter(ref: ParameterReference): any {
        const key = ref.name.startsWith("$") ? ref.name.substring(1) : ref.name;
        const parameters = this._options.parameters;
        if (parameters !== undefined && key in parameters) {
            return parameters[key];
        }
        const queryParameters = this._isTopLevel ? undefined : this._sourceContext?.parameters;
        if (ref.inVirtualDefinition) {
            const args = this._args ?? {};
            if (key === "args") return args;
            if (key in args) return args[key];
            if (queryParameters !== undefined && key in queryParameters) {
                return queryParameters[key];
            }
            return null;
        }
        if (queryParameters !== undefined && key in queryParameters) {
            return queryParameters[key];
        }
        if (this._args !== null && key in this._args) {
            return this._args[key];
        }
        if (key === "args" || key === "request") {
            throw new Error(
                `Parameter $${key} is only available inside virtual node or relationship definitions`
            );
        }
        throw new Error(`Missing value for parameter $${key}`);
    }

    /**
     * Recursively walks the AST to collect the names of all
     * `BindingReference`s.  Used to refresh stale refreshable
     * bindings before statement execution begins.
     */
    private collectBindingNames(node: ASTNode, names: Set<string>): void {
        if (node instanceof BindingReference) {
            names.add(node.name);
        }
        for (const child of node.getChildren()) {
            this.collectBindingNames(child, names);
        }
    }

    /**
     * Gets the results from the executed statement.
     *
     * @returns The results from the last operation (typically a RETURN statement)
     */
    public get results(): any {
        if (this._committedResults !== null) return this._committedResults;
        return this._statements[this._statements.length - 1].last.results;
    }

    /**
     * Gets metadata about the operations in this query.
     *
     * Returns a deep copy so callers can mutate the result without affecting
     * subsequent reads.
     */
    public get metadata(): RunnerMetadata {
        const m = this._metadata;
        return {
            virtual_nodes_created: m.virtual_nodes_created,
            virtual_relationships_created: m.virtual_relationships_created,
            virtual_nodes_deleted: m.virtual_nodes_deleted,
            virtual_relationships_deleted: m.virtual_relationships_deleted,
            info: m.info ? StatementInfoCrawler.clone(m.info) : undefined,
        };
    }

    /**
     * Row-level data lineage aligned by index with {@link results}.
     *
     * Each {@link RowProvenance} entry lists the concrete `id` values of the
     * node slots and the `(left_id, right_id, type)` hops of the
     * relationship slots that were bound while the corresponding result row
     * was being projected.
     *
     * Returns an empty array unless the runner was constructed with
     * `{ provenance: true }` or the query produced no rows.
     */
    public get provenance(): RowProvenance[] {
        return this._provenance ?? [];
    }

    /**
     * Convenience method that bundles structural lineage with row-level
     * provenance for a single result row.  Returns one {@link CellTrace}
     * per output column, pairing the column's
     * {@link ColumnLineage | structural lineage} (from
     * {@link metadata}`.info.returns`) with the node / relationship
     * bindings (from {@link provenance}) whose alias matches one of the
     * column's references.
     *
     * Equivalent to manually correlating `metadata.info.returns[col]`
     * with `provenance[rowIndex].nodes` / `.relationships`, but with
     * the `(alias, property) -> binding` join and the per-property
     * value extraction done for you.
     *
     * @param rowIndex - Zero-based index into {@link results}.
     * @returns A `{column -> CellTrace}` map aligned with the row.
     * @throws {RangeError} If `rowIndex` is out of bounds for `results`.
     */
    public traceRow(rowIndex: number): Record<string, CellTrace> {
        const rows = this.results as Record<string, any>[];
        const length = Array.isArray(rows) ? rows.length : 0;
        if (rowIndex < 0 || rowIndex >= length) {
            throw new RangeError(
                `Runner.traceRow: rowIndex ${rowIndex} out of bounds (results.length=${length})`
            );
        }
        const row = rows[rowIndex];
        const returns = this._metadata.info?.returns ?? {};
        const rowProv = this._provenance ? (this._provenance[rowIndex] ?? null) : null;
        const out: Record<string, CellTrace> = {};
        for (const column of Object.keys(row)) {
            const lineageRaw = returns[column];
            const lineage: ColumnLineage | null = lineageRaw
                ? Runner.cloneColumnLineage(lineageRaw)
                : null;
            const bindings: CellBindingTrace[] = [];
            if (rowProv !== null && lineage !== null) {
                for (const ref of lineage.references) {
                    if (ref.kind === "node") {
                        for (const n of rowProv.nodes) {
                            if (n.alias === ref.alias) {
                                bindings.push({
                                    reference: ref,
                                    value: Runner.readNodeProperty(n, ref.property),
                                    node: n,
                                });
                            }
                        }
                    } else {
                        for (const r of rowProv.relationships) {
                            if (r.alias === ref.alias) {
                                bindings.push({
                                    reference: ref,
                                    value: Runner.readRelationshipProperty(r, ref.property),
                                    relationship: r,
                                });
                            }
                        }
                    }
                }
            }
            out[column] = { column, value: row[column], lineage, bindings };
        }
        return out;
    }

    /**
     * One-shot combined lineage and provenance report for the entire
     * Runner execution.  Returns the structural per-column lineage
     * (deep copy of `metadata.info?.returns`) alongside one
     * {@link traceRow} map per result row.
     *
     * Useful as a single object to hand to a UI, dump to a log, or
     * snapshot for debugging.  For per-cell lookups during normal flow,
     * {@link traceRow} is cheaper.
     */
    public lineage(): LineageReport {
        const rows = (this.results as Record<string, any>[]) ?? [];
        const length = Array.isArray(rows) ? rows.length : 0;
        const returnsRaw = this._metadata.info?.returns ?? {};
        const columns: Record<string, ColumnLineage> = {};
        for (const [k, v] of Object.entries(returnsRaw)) {
            columns[k] = Runner.cloneColumnLineage(v);
        }
        const rowsOut: Record<string, CellTrace>[] = [];
        for (let i = 0; i < length; i++) {
            rowsOut.push(this.traceRow(i));
        }
        return { columns, rows: rowsOut };
    }

    private static cloneColumnLineage(lineage: ColumnLineage): ColumnLineage {
        const copy: ColumnLineage = {
            references: lineage.references.map((r) => ({
                alias: r.alias,
                kind: r.kind,
                labels: [...r.labels],
                property: r.property,
            })),
            kind: lineage.kind,
        };
        if (lineage.aggregate !== undefined) copy.aggregate = lineage.aggregate;
        return copy;
    }

    /**
     * Resolve `binding.property` against a captured `NodeBinding`.
     * The built-in `id` lives at the top of the binding (it's excluded
     * from `properties`); everything else comes from `properties`.
     */
    private static readNodeProperty(binding: NodeBinding, property: string): any {
        if (property === "id") return binding.id;
        return binding.properties?.[property];
    }

    /**
     * Resolve `binding.property` against a captured `RelationshipBinding`.
     * Returns the value from `hops[0]`: the built-ins `left_id`,
     * `right_id`, and `type` come from the hop itself, while everything
     * else comes from `hops[0].properties`.  For variable-length matches
     * with heterogeneous hops, inspect `relationship.hops` directly to
     * see per-hop values.
     */
    private static readRelationshipProperty(binding: RelationshipBinding, property: string): any {
        const firstHop = binding.hops[0];
        if (firstHop === undefined) return undefined;
        if (property === "left_id") return firstHop.left_id;
        if (property === "right_id") return firstHop.right_id;
        if (property === "type") return firstHop.type;
        return firstHop.properties?.[property];
    }
}

export default Runner;
