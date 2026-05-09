import Database from "../graph/database";
import Node from "../graph/node";
import Relationship from "../graph/relationship";
import ASTNode from "./ast_node";
import Lookup from "./data_structures/lookup";
import Expression from "./expressions/expression";
import FString from "./expressions/f_string";
import Identifier from "./expressions/identifier";
import { Equals, In } from "./expressions/operator";
import ParameterReference from "./expressions/parameter_reference";
import Reference from "./expressions/reference";
import SubqueryExpression from "./expressions/subquery_expression";
import AggregatedReturn from "./operations/aggregated_return";
import AggregatedWith from "./operations/aggregated_with";
import CreateNode from "./operations/create_node";
import CreateRelationship from "./operations/create_relationship";
import DeleteNode from "./operations/delete_node";
import DeleteRelationship from "./operations/delete_relationship";
import Load from "./operations/load";
import Match from "./operations/match";
import Operation from "./operations/operation";
import OrderBy from "./operations/order_by";
import Projection from "./operations/projection";
import Return from "./operations/return";
import With from "./operations/with";

/**
 * Per-entity lineage for a node label: which properties the query
 * accesses on it, the sources backing the virtual definition, and any
 * literal values the query supplies for those properties.
 */
export interface NodeInfo {
    properties: string[];
    sources: string[];
    /**
     * Literal values supplied for this label's properties at the call
     * site. Collected from inline node-property assignments
     * (`(u:User {id: 'rick.o'})`) and from equality / `IN` predicates
     * (`WHERE u.id = 'rick.o'`, `WHERE u.id IN ['a', 'b']`).
     *
     * Only purely literal AST subtrees (no references, parameters,
     * f-strings, or subqueries) are captured. Always present in objects
     * produced by the crawler (defaults to `{}`); optional in the
     * interface so externally-constructed `NodeInfo` literals remain
     * valid.
     */
    literal_values?: Record<string, any[]>;
}

/**
 * Per-entity lineage for a relationship type: which properties the query
 * accesses on it, the sources backing the virtual definitions, and any
 * literal values supplied for those properties. A single type may have
 * multiple sources when it spans several `(:From)-[:Type]-(:To)` definitions.
 */
export interface RelationshipInfo {
    properties: string[];
    sources: string[];
    /** Literal values supplied for this type's properties at the call site. */
    literal_values?: Record<string, any[]>;
}

/**
 * Schema-level lineage: the full set of properties projected by a virtual
 * definition (independent of whether the crawled statement consumes them)
 * plus the sources that back the definition.
 */
export interface DeclaredEntityInfo {
    properties: string[];
    sources: string[];
}

/**
 * Structural information extracted from a parsed FlowQuery statement.
 *
 * Captures the node labels, relationship types, data sources, and properties
 * the query references — independent of whether/when it has been executed.
 * The properties listed are those accessed by the *query itself* (e.g.
 * `n.name` in a MATCH/RETURN/WHERE/ORDER BY), not the columns produced by
 * the underlying virtual node/relationship definitions.
 *
 * To trace the full lineage from a property to its source, use the
 * {@link nodes} / {@link relationships} maps. Each entry there links a
 * label/type to its accessed properties, the sources that back it, and
 * any literal values supplied at the call site.
 *
 * To validate a query against the registered schema (e.g. "is
 * `User.phoneNumber` a declared property?"), use {@link declared}, which
 * lists the *full* set of properties projected by each virtual's RETURN
 * clause regardless of whether the query consumes them.
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
    /**
     * Per-label lineage: each accessed node label mapped to the
     * properties accessed on it, the sources that back it, and any
     * literal values supplied for those properties at the call site.
     */
    nodes: Record<string, NodeInfo>;
    /**
     * Per-type lineage: each accessed relationship type mapped to the
     * properties accessed on it, the sources that back it, and any
     * literal values supplied for those properties at the call site.
     */
    relationships: Record<string, RelationshipInfo>;
    /**
     * Schema-declared lineage. Lists, per label / relationship type, the
     * full set of properties projected by the virtual's RETURN clause
     * (or final WITH if no RETURN is present) — independent of whether
     * the crawled statement actually consumes them. Useful for validating
     * that a query references only declared properties.
     *
     * Includes both inline `CREATE VIRTUAL` declarations in the crawled
     * statements and any already-registered virtuals the statement
     * touches.
     */
    declared: {
        nodes: Record<string, DeclaredEntityInfo>;
        relationships: Record<string, DeclaredEntityInfo>;
    };
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
    private _nodeProps: Map<string, Set<string>> = new Map();
    private _relProps: Map<string, Set<string>> = new Map();
    private _nodeSources: Map<string, Set<string>> = new Map();
    private _relSources: Map<string, Set<string>> = new Map();
    private _nodeLiterals: Map<string, Map<string, any[]>> = new Map();
    private _relLiterals: Map<string, Map<string, any[]>> = new Map();
    private _nodeDeclaredProps: Map<string, Set<string>> = new Map();
    private _relDeclaredProps: Map<string, Set<string>> = new Map();
    private _nodeDeclaredSources: Map<string, Set<string>> = new Map();
    private _relDeclaredSources: Map<string, Set<string>> = new Map();
    private _ownCreatedNodeLabels: Set<string> = new Set();
    private _ownCreatedRelTypes: Set<string> = new Set();
    /**
     * For each inline CREATE VIRTUAL clause, the (label or type) it
     * declares and its inner statement AST. The label key receives the
     * sources collected from the statement during {@link resolveRegisteredDefinitions}.
     */
    private _ownNodeCreates: Array<{ label: string; statement: ASTNode }> = [];
    private _ownRelCreates: Array<{ type: string; statement: ASTNode }> = [];

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
        this.resolveRegisteredDefinitions();
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
        this._nodeProps = new Map();
        this._relProps = new Map();
        this._nodeSources = new Map();
        this._relSources = new Map();
        this._nodeLiterals = new Map();
        this._relLiterals = new Map();
        this._nodeDeclaredProps = new Map();
        this._relDeclaredProps = new Map();
        this._nodeDeclaredSources = new Map();
        this._relDeclaredSources = new Map();
        this._ownCreatedNodeLabels = new Set();
        this._ownCreatedRelTypes = new Set();
        this._ownNodeCreates = [];
        this._ownRelCreates = [];
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
                if (op.statement) {
                    this._ownNodeCreates.push({ label: node.label, statement: op.statement });
                }
            }
        } else if (op instanceof CreateRelationship) {
            const rel = op.relationship;
            if (rel?.type) {
                this._relTypes.add(rel.type);
                this._ownCreatedRelTypes.add(rel.type);
                if (op.statement) {
                    this._ownRelCreates.push({ type: rel.type, statement: op.statement });
                }
            }
            if (rel?.source?.label) this._nodeLabels.add(rel.source.label);
            if (rel?.target?.label) this._nodeLabels.add(rel.target.label);
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
                        for (const [propKey, expr] of element.properties) {
                            this.addNodeProp(element.labels, propKey);
                            this.tryAddNodeLiteral(element.labels, propKey, expr);
                        }
                    } else if (element instanceof Relationship) {
                        for (const t of element.types) this._relTypes.add(t);
                        for (const [propKey, expr] of element.properties) {
                            this.addRelProp(element.types, propKey);
                            this.tryAddRelLiteral(element.types, propKey, expr);
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

    private resolveRegisteredDefinitions(): void {
        // Sources and declared properties from inline CREATE VIRTUAL clauses
        // in the crawled statements.
        for (const { label, statement } of this._ownNodeCreates) {
            this.collectSources(statement, this.getOrCreate(this._nodeSources, label));
            this.collectSources(statement, this.getOrCreate(this._nodeDeclaredSources, label));
            this.collectDeclaredProps(statement, this.getOrCreate(this._nodeDeclaredProps, label));
        }
        for (const { type, statement } of this._ownRelCreates) {
            this.collectSources(statement, this.getOrCreate(this._relSources, type));
            this.collectSources(statement, this.getOrCreate(this._relDeclaredSources, type));
            this.collectDeclaredProps(statement, this.getOrCreate(this._relDeclaredProps, type));
        }

        // Sources / declared properties from already-registered virtuals
        // that the crawled statements reference (e.g. MATCH/DELETE against
        // a virtual registered earlier).
        const db = Database.getInstance();
        for (const label of this._nodeLabels) {
            if (this._ownCreatedNodeLabels.has(label)) continue;
            const physical = db.nodes.get(label);
            if (physical?.statement) {
                this.collectSources(physical.statement, this.getOrCreate(this._nodeSources, label));
                this.collectSources(
                    physical.statement,
                    this.getOrCreate(this._nodeDeclaredSources, label)
                );
                this.collectDeclaredProps(
                    physical.statement,
                    this.getOrCreate(this._nodeDeclaredProps, label)
                );
            }
        }
        for (const type of this._relTypes) {
            if (this._ownCreatedRelTypes.has(type)) continue;
            const typeMap = db.relationships.get(type);
            if (typeMap === undefined) continue;
            for (const physical of typeMap.values()) {
                if (physical.statement) {
                    this.collectSources(
                        physical.statement,
                        this.getOrCreate(this._relSources, type)
                    );
                    this.collectSources(
                        physical.statement,
                        this.getOrCreate(this._relDeclaredSources, type)
                    );
                    this.collectDeclaredProps(
                        physical.statement,
                        this.getOrCreate(this._relDeclaredProps, type)
                    );
                }
            }
        }
    }

    private getOrCreate(map: Map<string, Set<string>>, key: string): Set<string> {
        let set = map.get(key);
        if (set === undefined) {
            set = new Set();
            map.set(key, set);
        }
        return set;
    }

    /**
     * Walks the AST rooted at `root` and records every property access
     * (via `Lookup`) on a known node/relationship binding, every literal
     * value supplied via equality / `IN` predicates, and descends into
     * subqueries plus the privately-held WHERE / ORDER BY ASTs of
     * RETURN-style operations.
     */
    private collectPropertyAccesses(root: ASTNode): void {
        const visited = new Set<ASTNode>();
        const stack: ASTNode[] = [root];
        while (stack.length > 0) {
            const node = stack.pop()!;
            if (visited.has(node)) continue;
            visited.add(node);

            if (node instanceof Lookup) {
                this.handleLookupAccess(node);
            }

            if (node instanceof Equals) {
                this.handleEqualityLiteral(node);
            } else if (node instanceof In) {
                this.handleInLiteral(node);
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
            // RETURN / AggregatedReturn hold WHERE and ORDER BY clauses in
            // private fields; descend into the ones with expression trees.
            if (node instanceof Return) {
                const w = (node as any)._where as ASTNode | null;
                const o = (node as any)._orderBy as ASTNode | null;
                if (w) stack.push(w);
                if (o) stack.push(o);
            }
            // OrderBy stores its sort expressions in a private array of
            // SortField objects rather than as AST children; descend
            // explicitly.
            if (node instanceof OrderBy) {
                for (const field of node.fields) {
                    stack.push(field.expression);
                }
            }
        }
    }

    private handleLookupAccess(node: Lookup): void {
        const target = this.resolveLookupTarget(node);
        if (target === null) return;
        if (target.kind === "node") {
            this.addNodeProp(target.labels, target.prop);
        } else {
            this.addRelProp(target.types, target.prop);
        }
    }

    /**
     * Resolves a `Lookup` of the shape `alias.prop` to the labels/types
     * of the bound entity and the property name. Returns `null` if the
     * lookup isn't of that shape or its variable doesn't resolve to a
     * Node/Relationship.
     */
    private resolveLookupTarget(
        lookup: Lookup
    ):
        | { kind: "node"; labels: string[]; prop: string }
        | { kind: "rel"; types: string[]; prop: string }
        | null {
        const variable = lookup.variable;
        const index = lookup.index;
        if (!(variable instanceof Reference) || !(index instanceof Identifier)) return null;
        const propName = index.value();
        if (typeof propName !== "string" || propName.length === 0) return null;
        const referred = variable.referred;
        if (referred instanceof Node) {
            return { kind: "node", labels: referred.labels, prop: propName };
        }
        if (referred instanceof Relationship) {
            return { kind: "rel", types: referred.types, prop: propName };
        }
        return null;
    }

    private handleEqualityLiteral(op: Equals): void {
        const lhs = op.lhs;
        const rhs = op.rhs;
        // Try both orientations: `alias.prop = literal` and `literal = alias.prop`.
        this.tryRecordPropEquality(lhs, rhs);
        this.tryRecordPropEquality(rhs, lhs);
    }

    private tryRecordPropEquality(side: ASTNode, other: ASTNode): void {
        if (!(side instanceof Lookup)) return;
        if (!this.isLiteralAst(other)) return;
        const target = this.resolveLookupTarget(side);
        if (target === null) return;
        const value = this.safeEvaluate(other);
        if (value === undefined) return;
        if (target.kind === "node") {
            this.addNodeLiteralValue(target.labels, target.prop, value);
        } else {
            this.addRelLiteralValue(target.types, target.prop, value);
        }
    }

    private handleInLiteral(op: In): void {
        const lhs = op.lhs;
        const rhs = op.rhs;
        if (!(lhs instanceof Lookup)) return;
        if (!this.isLiteralAst(rhs)) return;
        const target = this.resolveLookupTarget(lhs);
        if (target === null) return;
        const value = this.safeEvaluate(rhs);
        if (!Array.isArray(value)) return;
        for (const item of value) {
            if (target.kind === "node") {
                this.addNodeLiteralValue(target.labels, target.prop, item);
            } else {
                this.addRelLiteralValue(target.types, target.prop, item);
            }
        }
    }

    /**
     * Returns true iff the AST subtree contains only literal nodes (no
     * References, ParameterReferences, Lookups, FStrings, or
     * SubqueryExpressions). Used to guard literal-value extraction
     * against runtime-dependent expressions.
     */
    private isLiteralAst(node: ASTNode): boolean {
        if (
            node instanceof Reference ||
            node instanceof ParameterReference ||
            node instanceof Lookup ||
            node instanceof FString ||
            node instanceof SubqueryExpression
        ) {
            return false;
        }
        for (const child of node.getChildren()) {
            if (!this.isLiteralAst(child)) return false;
        }
        return true;
    }

    private safeEvaluate(node: ASTNode): any {
        try {
            return node.value();
        } catch {
            return undefined;
        }
    }

    private tryAddNodeLiteral(labels: string[], prop: string, expr: Expression): void {
        if (!this.isLiteralAst(expr)) return;
        const value = this.safeEvaluate(expr);
        if (value === undefined) return;
        this.addNodeLiteralValue(labels, prop, value);
    }

    private tryAddRelLiteral(types: string[], prop: string, expr: Expression): void {
        if (!this.isLiteralAst(expr)) return;
        const value = this.safeEvaluate(expr);
        if (value === undefined) return;
        this.addRelLiteralValue(types, prop, value);
    }

    /**
     * Walks a virtual definition's inner statement to find the final
     * RETURN-style projection and records its aliases as the declared
     * property set. Falls back to the last WITH if no RETURN exists.
     */
    private collectDeclaredProps(statement: ASTNode, target: Set<string>): void {
        let op: Operation | null = null;
        try {
            op = statement.firstChild() as Operation;
        } catch {
            return;
        }
        let lastReturn: Projection | null = null;
        let lastWith: Projection | null = null;
        while (op !== null) {
            if (op instanceof Return || op instanceof AggregatedReturn) {
                lastReturn = op;
            } else if (op instanceof With || op instanceof AggregatedWith) {
                lastWith = op;
            }
            op = op.next;
        }
        const projection = lastReturn ?? lastWith;
        if (projection === null) return;
        for (const alias of this.projectionAliases(projection)) {
            target.add(alias);
        }
    }

    /**
     * Yields the alias of every projected expression in a Projection.
     * Mirrors the alias-resolution logic of `Projection.expressions()`
     * (which is protected).
     */
    private *projectionAliases(projection: Projection): Generator<string> {
        const children = projection.getChildren();
        for (let i = 0; i < children.length; i++) {
            const expr = children[i] as Expression;
            const alias = expr.alias ?? `expr${i}`;
            if (typeof alias === "string" && alias.length > 0) {
                yield alias;
            }
        }
    }

    private collectSources(statement: ASTNode, target: Set<string>): void {
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
                    if (typeof name === "string" && name.length > 0) target.add(name);
                } else {
                    try {
                        const from = op.from;
                        if (typeof from === "string" && from.length > 0) target.add(from);
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

    private addNodeLiteralValue(labels: string[], prop: string, value: any): void {
        for (const label of labels) {
            if (!label) continue;
            let propMap = this._nodeLiterals.get(label);
            if (propMap === undefined) {
                propMap = new Map();
                this._nodeLiterals.set(label, propMap);
            }
            this.appendUniqueLiteral(propMap, prop, value);
        }
    }

    private addRelLiteralValue(types: string[], prop: string, value: any): void {
        for (const type of types) {
            if (!type) continue;
            let propMap = this._relLiterals.get(type);
            if (propMap === undefined) {
                propMap = new Map();
                this._relLiterals.set(type, propMap);
            }
            this.appendUniqueLiteral(propMap, prop, value);
        }
    }

    private appendUniqueLiteral(propMap: Map<string, any[]>, prop: string, value: any): void {
        let arr = propMap.get(prop);
        if (arr === undefined) {
            arr = [];
            propMap.set(prop, arr);
        }
        for (const existing of arr) {
            if (this.literalsEqual(existing, value)) return;
        }
        arr.push(value);
    }

    private literalsEqual(a: any, b: any): boolean {
        if (a === b) return true;
        if (a === null || b === null || a === undefined || b === undefined) return false;
        if (typeof a !== typeof b) return false;
        if (typeof a !== "object") return false;
        if (Array.isArray(a) !== Array.isArray(b)) return false;
        if (Array.isArray(a)) {
            if (a.length !== b.length) return false;
            for (let i = 0; i < a.length; i++) {
                if (!this.literalsEqual(a[i], b[i])) return false;
            }
            return true;
        }
        const ka = Object.keys(a);
        const kb = Object.keys(b);
        if (ka.length !== kb.length) return false;
        for (const k of ka) {
            if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
            if (!this.literalsEqual(a[k], b[k])) return false;
        }
        return true;
    }

    private literalsSnapshot(
        map: Map<string, Map<string, any[]>>,
        key: string
    ): Record<string, any[]> {
        const propMap = map.get(key);
        if (propMap === undefined || propMap.size === 0) return {};
        const out: Record<string, any[]> = {};
        const sortedKeys = Array.from(propMap.keys()).sort();
        for (const propKey of sortedKeys) {
            out[propKey] = [...propMap.get(propKey)!];
        }
        return out;
    }

    private snapshot(): StatementInfo {
        const allSources = new Set<string>();
        const nodes: Record<string, NodeInfo> = {};
        for (const label of this._nodeLabels) {
            const props = this._nodeProps.get(label);
            const sources = this._nodeSources.get(label);
            if (sources !== undefined) {
                for (const s of sources) allSources.add(s);
            }
            nodes[label] = {
                properties: props ? Array.from(props).sort() : [],
                sources: sources ? Array.from(sources).sort() : [],
                literal_values: this.literalsSnapshot(this._nodeLiterals, label),
            };
        }
        const relationships: Record<string, RelationshipInfo> = {};
        for (const type of this._relTypes) {
            const props = this._relProps.get(type);
            const sources = this._relSources.get(type);
            if (sources !== undefined) {
                for (const s of sources) allSources.add(s);
            }
            relationships[type] = {
                properties: props ? Array.from(props).sort() : [],
                sources: sources ? Array.from(sources).sort() : [],
                literal_values: this.literalsSnapshot(this._relLiterals, type),
            };
        }
        const declaredNodes: Record<string, DeclaredEntityInfo> = {};
        for (const label of this._nodeLabels) {
            const props = this._nodeDeclaredProps.get(label);
            const sources = this._nodeDeclaredSources.get(label);
            if ((props && props.size > 0) || (sources && sources.size > 0)) {
                declaredNodes[label] = {
                    properties: props ? Array.from(props).sort() : [],
                    sources: sources ? Array.from(sources).sort() : [],
                };
            }
        }
        const declaredRelationships: Record<string, DeclaredEntityInfo> = {};
        for (const type of this._relTypes) {
            const props = this._relDeclaredProps.get(type);
            const sources = this._relDeclaredSources.get(type);
            if ((props && props.size > 0) || (sources && sources.size > 0)) {
                declaredRelationships[type] = {
                    properties: props ? Array.from(props).sort() : [],
                    sources: sources ? Array.from(sources).sort() : [],
                };
            }
        }
        const info: StatementInfo = {
            node_labels: Array.from(this._nodeLabels).sort(),
            relationship_types: Array.from(this._relTypes).sort(),
            sources: Array.from(allSources).sort(),
            node_properties: {},
            relationship_properties: {},
            nodes,
            relationships,
            declared: {
                nodes: declaredNodes,
                relationships: declaredRelationships,
            },
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
        const cloneLiterals = (literals: Record<string, any[]>): Record<string, any[]> => {
            const out: Record<string, any[]> = {};
            for (const [k, v] of Object.entries(literals)) {
                out[k] = v.map((item) =>
                    typeof item === "object" && item !== null ? structuredClone(item) : item
                );
            }
            return out;
        };
        const cloneEntities = <T extends NodeInfo | RelationshipInfo>(
            entities: Record<string, T>
        ): Record<string, T> => {
            const out: Record<string, T> = {};
            for (const [k, v] of Object.entries(entities)) {
                out[k] = {
                    properties: [...v.properties],
                    sources: [...v.sources],
                    literal_values: cloneLiterals(v.literal_values ?? {}),
                } as T;
            }
            return out;
        };
        const cloneDeclared = (
            entities: Record<string, DeclaredEntityInfo>
        ): Record<string, DeclaredEntityInfo> => {
            const out: Record<string, DeclaredEntityInfo> = {};
            for (const [k, v] of Object.entries(entities)) {
                out[k] = {
                    properties: [...v.properties],
                    sources: [...v.sources],
                };
            }
            return out;
        };
        return {
            node_labels: [...info.node_labels],
            relationship_types: [...info.relationship_types],
            sources: [...info.sources],
            node_properties: cloneProps(info.node_properties),
            relationship_properties: cloneProps(info.relationship_properties),
            nodes: cloneEntities(info.nodes),
            relationships: cloneEntities(info.relationships),
            declared: {
                nodes: cloneDeclared(info.declared?.nodes ?? {}),
                relationships: cloneDeclared(info.declared?.relationships ?? {}),
            },
        };
    }
}

export default StatementInfoCrawler;
