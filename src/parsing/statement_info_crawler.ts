import Database from "../graph/database";
import Node from "../graph/node";
import Relationship from "../graph/relationship";
import ASTNode from "./ast_node";
import Lookup from "./data_structures/lookup";
import Identifier from "./expressions/identifier";
import Reference from "./expressions/reference";
import SubqueryExpression from "./expressions/subquery_expression";
import CreateNode from "./operations/create_node";
import CreateRelationship from "./operations/create_relationship";
import DeleteNode from "./operations/delete_node";
import DeleteRelationship from "./operations/delete_relationship";
import Load from "./operations/load";
import Match from "./operations/match";
import Operation from "./operations/operation";

/**
 * Structural information extracted from a parsed FlowQuery statement.
 *
 * Captures the node labels, relationship types, data sources, and properties
 * the query references — independent of whether/when it has been executed.
 * The properties listed are those accessed by the *query itself* (e.g.
 * `n.name` in a MATCH/RETURN/WHERE), not the columns produced by the
 * underlying virtual node/relationship definitions.
 */
export interface StatementInfo {
    /** Unique node labels referenced by MATCH/CREATE/DELETE in the statement(s). */
    node_labels: string[];
    /** Unique relationship types referenced by MATCH/CREATE/DELETE in the statement(s). */
    relationship_types: string[];
    /**
     * Unique source URLs / file URIs / async-function names used by the
     * virtual node and relationship definitions the statement touches.
     * Includes both the inline definitions in CREATE VIRTUAL clauses and
     * the definitions of any already-registered virtuals the statement
     * MATCHes or DELETEs.
     */
    sources: string[];
    /** Node properties accessed by the statement, grouped by label. */
    node_properties: Record<string, string[]>;
    /** Relationship properties accessed by the statement, grouped by type. */
    relationship_properties: Record<string, string[]>;
}

/**
 * Walks one or more parsed FlowQuery statement ASTs and extracts a
 * `StatementInfo` describing the labels, relationship types, sources, and
 * properties they reference.
 *
 * The crawler does not execute the statement. It only inspects the AST
 * structure plus the live `Database` registry (to resolve sources for
 * virtuals that are referenced but not (re-)declared in the AST).
 *
 * @example
 * ```typescript
 * const crawler = new StatementInfoCrawler();
 * const info = crawler.crawl(ast);
 * console.log(info.node_labels);
 * ```
 */
class StatementInfoCrawler {
    private _nodeLabels: Set<string> = new Set();
    private _relTypes: Set<string> = new Set();
    private _sources: Set<string> = new Set();
    private _nodeProps: Map<string, Set<string>> = new Map();
    private _relProps: Map<string, Set<string>> = new Map();
    private _ownCreatedNodeLabels: Set<string> = new Set();
    private _ownCreatedRelTypes: Set<string> = new Set();
    private _ownCreateStatements: ASTNode[] = [];

    /**
     * Walks one or more statement ASTs and returns the merged structural info.
     *
     * @param statements - A single statement root, or an iterable of roots
     *                     (for multi-statement queries).
     */
    public crawl(statements: ASTNode | Iterable<ASTNode>): StatementInfo {
        this.reset();
        const roots = this.toIterable(statements);
        for (const root of roots) {
            this.crawlStatement(root);
        }
        this.resolveRegisteredSources();
        return this.snapshot();
    }

    private toIterable(statements: ASTNode | Iterable<ASTNode>): Iterable<ASTNode> {
        if (statements instanceof ASTNode) {
            return [statements];
        }
        return statements;
    }

    private reset(): void {
        this._nodeLabels = new Set();
        this._relTypes = new Set();
        this._sources = new Set();
        this._nodeProps = new Map();
        this._relProps = new Map();
        this._ownCreatedNodeLabels = new Set();
        this._ownCreatedRelTypes = new Set();
        this._ownCreateStatements = [];
    }

    private crawlStatement(root: ASTNode): void {
        let op: Operation | null = null;
        try {
            op = root.firstChild() as Operation;
        } catch {
            return;
        }
        while (op !== null) {
            this.visitOperation(op);
            op = op.next;
        }
    }

    private visitOperation(op: Operation): void {
        if (op instanceof CreateNode) {
            const node = op.node;
            if (node?.label) {
                this._nodeLabels.add(node.label);
                this._ownCreatedNodeLabels.add(node.label);
            }
            if (op.statement) this._ownCreateStatements.push(op.statement);
        } else if (op instanceof CreateRelationship) {
            const rel = op.relationship;
            if (rel?.type) {
                this._relTypes.add(rel.type);
                this._ownCreatedRelTypes.add(rel.type);
            }
            if (rel?.source?.label) this._nodeLabels.add(rel.source.label);
            if (rel?.target?.label) this._nodeLabels.add(rel.target.label);
            if (op.statement) this._ownCreateStatements.push(op.statement);
        } else if (op instanceof DeleteNode) {
            if (op.node?.label) this._nodeLabels.add(op.node.label);
        } else if (op instanceof DeleteRelationship) {
            const rel = op.relationship;
            if (rel?.type) this._relTypes.add(rel.type);
            if (rel?.source?.label) this._nodeLabels.add(rel.source.label);
            if (rel?.target?.label) this._nodeLabels.add(rel.target.label);
        } else if (op instanceof Match) {
            for (const pattern of op.patterns) {
                for (const element of pattern.chain) {
                    if (element instanceof Node) {
                        for (const lbl of element.labels) this._nodeLabels.add(lbl);
                        for (const propKey of element.properties.keys()) {
                            this.addNodeProp(element.labels, propKey);
                        }
                    } else if (element instanceof Relationship) {
                        for (const t of element.types) this._relTypes.add(t);
                        for (const propKey of element.properties.keys()) {
                            this.addRelProp(element.types, propKey);
                        }
                    }
                }
            }
        }

        // CREATE/DELETE VIRTUAL operations describe registry mutations rather
        // than query-side property accesses; their inner ASTs are crawled
        // separately for sources, but we don't surface their property usage.
        if (
            !(op instanceof CreateNode) &&
            !(op instanceof CreateRelationship) &&
            !(op instanceof DeleteNode) &&
            !(op instanceof DeleteRelationship)
        ) {
            this.collectPropertyAccesses(op);
        }
    }

    private resolveRegisteredSources(): void {
        // Sources from inline CREATE VIRTUAL clauses in the crawled statements.
        for (const stmt of this._ownCreateStatements) {
            this.collectSources(stmt);
        }

        // Sources from already-registered virtuals that the crawled statements
        // reference (e.g. MATCH/DELETE against a virtual registered earlier).
        const db = Database.getInstance();
        for (const label of this._nodeLabels) {
            if (this._ownCreatedNodeLabels.has(label)) continue;
            const physical = db.nodes.get(label);
            if (physical?.statement) this.collectSources(physical.statement);
        }
        for (const type of this._relTypes) {
            if (this._ownCreatedRelTypes.has(type)) continue;
            const typeMap = db.relationships.get(type);
            if (typeMap === undefined) continue;
            for (const physical of typeMap.values()) {
                if (physical.statement) this.collectSources(physical.statement);
            }
        }
    }

    private collectPropertyAccesses(root: ASTNode): void {
        const visited = new Set<ASTNode>();
        const stack: ASTNode[] = [root];
        while (stack.length > 0) {
            const node = stack.pop()!;
            if (visited.has(node)) continue;
            visited.add(node);

            if (node instanceof Lookup) {
                const variable = node.variable;
                const index = node.index;
                if (variable instanceof Reference && index instanceof Identifier) {
                    const referred = variable.referred;
                    const propName = index.value();
                    if (typeof propName === "string" && propName.length > 0) {
                        if (referred instanceof Node) {
                            this.addNodeProp(referred.labels, propName);
                        } else if (referred instanceof Relationship) {
                            this.addRelProp(referred.types, propName);
                        }
                    }
                }
            }

            for (const child of node.getChildren()) {
                stack.push(child);
            }
            // Subquery expressions hold their inner AST in a private field
            // rather than as a child; descend into it explicitly.
            if (node instanceof SubqueryExpression) {
                const inner = (node as any)._subqueryAST as ASTNode | undefined;
                if (inner !== undefined) stack.push(inner);
            }
        }
    }

    private collectSources(statement: ASTNode): void {
        let op: Operation | null = null;
        try {
            op = statement.firstChild() as Operation;
        } catch {
            return;
        }
        while (op !== null) {
            if (op instanceof Load) {
                if (op.isAsyncFunction) {
                    const name = op.asyncFunction?.name;
                    if (typeof name === "string" && name.length > 0) this._sources.add(name);
                } else {
                    try {
                        const from = op.from;
                        if (typeof from === "string" && from.length > 0) this._sources.add(from);
                    } catch {
                        // Dynamic source (e.g. f-string with unresolved refs);
                        // skip rather than fail metadata extraction.
                    }
                }
            }
            op = op.next;
        }
    }

    private addNodeProp(labels: string[], prop: string): void {
        for (const label of labels) {
            if (!label) continue;
            let set = this._nodeProps.get(label);
            if (set === undefined) {
                set = new Set();
                this._nodeProps.set(label, set);
            }
            set.add(prop);
        }
    }

    private addRelProp(types: string[], prop: string): void {
        for (const type of types) {
            if (!type) continue;
            let set = this._relProps.get(type);
            if (set === undefined) {
                set = new Set();
                this._relProps.set(type, set);
            }
            set.add(prop);
        }
    }

    private snapshot(): StatementInfo {
        const info: StatementInfo = {
            node_labels: Array.from(this._nodeLabels).sort(),
            relationship_types: Array.from(this._relTypes).sort(),
            sources: Array.from(this._sources).sort(),
            node_properties: {},
            relationship_properties: {},
        };
        for (const [label, props] of this._nodeProps) {
            info.node_properties[label] = Array.from(props).sort();
        }
        for (const [type, props] of this._relProps) {
            info.relationship_properties[type] = Array.from(props).sort();
        }
        return info;
    }

    /**
     * Returns a deep copy of a StatementInfo so callers can mutate it freely.
     */
    public static clone(info: StatementInfo): StatementInfo {
        const cloneProps = (props: Record<string, string[]>): Record<string, string[]> => {
            const out: Record<string, string[]> = {};
            for (const [k, v] of Object.entries(props)) out[k] = [...v];
            return out;
        };
        return {
            node_labels: [...info.node_labels],
            relationship_types: [...info.relationship_types],
            sources: [...info.sources],
            node_properties: cloneProps(info.node_properties),
            relationship_properties: cloneProps(info.relationship_properties),
        };
    }
}

export default StatementInfoCrawler;
