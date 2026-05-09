import DataCache from "../graph/data_cache";
import DataResolver from "../graph/data_resolver";
import ASTNode from "../parsing/ast_node";
import ParameterReference from "../parsing/expressions/parameter_reference";
import CreateNode from "../parsing/operations/create_node";
import CreateRelationship from "../parsing/operations/create_relationship";
import DeleteNode from "../parsing/operations/delete_node";
import DeleteRelationship from "../parsing/operations/delete_relationship";
import Operation from "../parsing/operations/operation";
import Parser from "../parsing/parser";
import StatementInfoCrawler, { StatementInfo } from "../parsing/statement_info_crawler";

export type { StatementInfo } from "../parsing/statement_info_crawler";

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

    /**
     * Creates a new Runner instance and parses the FlowQuery statement.
     *
     * @param statement - The FlowQuery statement to execute (may contain semicolon-separated statements)
     * @param ast - An optional pre-parsed AST to use instead of parsing the statement
     * @param args - Optional parameters to inject into $-prefixed parameter references
     * @throws {Error} If the statement is null, empty, or contains syntax errors
     */
    constructor(
        statement: string | null = null,
        ast: ASTNode | null = null,
        args: Record<string, any> | null = null
    ) {
        if ((statement === null || statement === "") && ast === null) {
            throw new Error("Either statement or AST must be provided");
        }
        this._args = args;

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
                    DataResolver.getInstance().dataCache = new DataCache();
                }
                for (const stmt of this._statements) {
                    this.bindParameters(stmt.ast);
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
}

export default Runner;
