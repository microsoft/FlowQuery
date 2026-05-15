import Bindings from "../graph/bindings";
import DataCache from "../graph/data_cache";
import DataResolver from "../graph/data_resolver";
import Node from "../graph/node";
import Pattern from "../graph/pattern";
import Relationship from "../graph/relationship";
import ASTNode from "../parsing/ast_node";
import BindingReference from "../parsing/expressions/binding_reference";
import ParameterReference from "../parsing/expressions/parameter_reference";
import AggregatedReturn from "../parsing/operations/aggregated_return";
import AggregatedWith from "../parsing/operations/aggregated_with";
import CreateNode from "../parsing/operations/create_node";
import CreateRelationship from "../parsing/operations/create_relationship";
import DeleteNode from "../parsing/operations/delete_node";
import DeleteRelationship from "../parsing/operations/delete_relationship";
import Match from "../parsing/operations/match";
import Operation from "../parsing/operations/operation";
import Return from "../parsing/operations/return";
import Union from "../parsing/operations/union";
import Parser from "../parsing/parser";
import StatementInfoCrawler, { StatementInfo } from "../parsing/statement_info_crawler";
import { ProvenanceSites, RowProvenance } from "./provenance";

export type { StatementInfo } from "../parsing/statement_info_crawler";
export type {
    NodeBinding,
    RelationshipBinding,
    RelationshipHop,
    RowProvenance,
} from "./provenance";

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
     * Defaults to `false`; when disabled the runner has zero provenance
     * overhead.
     */
    provenance?: boolean;

    /**
     * When `true`, threads provenance through virtual sub-query lineage:
     * each {@link NodeBinding} / {@link RelationshipHop} whose record
     * originated from a `CREATE VIRTUAL (:X) AS { ... }` block also carries
     * the inner runner's row provenance under `source`.  Recursive — a
     * virtual that matches another virtual will carry nested `source`
     * chains.
     *
     * Implies `provenance: true`.  Defaults to `false`.
     */
    deep?: boolean;
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
        this._options = options.deep ? { ...options, provenance: true } : options;

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
            try {
                if (this._isTopLevel) {
                    DataResolver.getInstance().dataCache = new DataCache(
                        this._options.deep === true
                    );
                }
                if (this._options.provenance) {
                    this._provenance = [];
                    this.enableProvenance();
                }
                for (const stmt of this._statements) {
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
                    await stmt.first.initialize();
                    await stmt.first.run();
                    await stmt.first.finish();
                }
                resolve();
            } catch (e) {
                reject(e);
            }
        });
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
        this.attachProvenance(stmt.first, this._provenance!);
    }

    /**
     * Walk `first..terminal`, accumulating live MATCH sites into the
     * "active" source list and handing it off at every aggregation
     * boundary.  Each `AggregatedWith` consumes the active list and then
     * re-publishes itself as the single active source going forward.
     */
    private attachProvenance(first: Operation, sink: RowProvenance[]): void {
        let activeSites: ProvenanceSites = new ProvenanceSites();
        // Extra (non-site) sources contributed by upstream aggregations.
        let activeAggregations: AggregatedWith[] = [];
        let op: Operation | null = first;
        let terminal: Operation | null = null;
        while (op !== null) {
            if (op instanceof Match) {
                for (const pattern of op.patterns) {
                    Runner.collectSitesFromPattern(pattern, activeSites);
                }
            } else if (op instanceof AggregatedWith) {
                // Aggregation boundary: hand off current sources and
                // re-publish the aggregation as the new source.
                if (!activeSites.isEmpty) {
                    op.addProvenanceSource(activeSites);
                }
                for (const a of activeAggregations) {
                    op.addProvenanceSource(a.asProvenanceSource());
                }
                activeSites = new ProvenanceSites();
                activeAggregations = [op];
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
            this.attachProvenance(terminal.left, leftSink);
            this.attachProvenance(terminal.right, rightSink);
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
     * Recursively walks the AST to bind ParameterReference nodes
     * to the args provided to this Runner.
     * - $args resolves to the entire args map (for use with $args.key lookups)
     * - $name resolves to args["name"] (shorthand for individual properties)
     */
    private bindParameters(node: ASTNode): void {
        if (node instanceof ParameterReference) {
            const args = this._args ?? {};
            const key = node.name.startsWith("$") ? node.name.substring(1) : node.name;
            if (key === "args") {
                node.parameterValue = args;
            } else {
                node.parameterValue = key in args ? args[key] : null;
            }
        }
        for (const child of node.getChildren()) {
            this.bindParameters(child);
        }
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
}

export default Runner;
