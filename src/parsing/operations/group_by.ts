import {
    NodeBinding,
    ProvenanceSites,
    RelationshipBinding,
    RowProvenance,
    nodeBindingKey,
    relationshipBindingKey,
} from "../../compute/provenance";
import Expression from "../expressions/expression";
import AggregateFunction from "../functions/aggregate_function";
import AggregationElement from "../functions/reducer_element";
import Projection from "./projection";
import Where from "./where";

class Node {
    private _value: any;
    private _children: Map<string, Node> = new Map();
    private _elements: AggregationElement[] | null = null;
    private _provenanceNodes: Map<string, NodeBinding> | null = null;
    private _provenanceRels: Map<string, RelationshipBinding> | null = null;
    constructor(value: any = null) {
        this._value = value;
    }
    public get value(): any {
        return this._value;
    }
    public get children(): Map<string, Node> {
        return this._children;
    }
    public get elements(): AggregationElement[] | null {
        return this._elements;
    }
    public set elements(elements: AggregationElement[]) {
        this._elements = elements;
    }
    /** Per-group dedup map for contributing node bindings (lazy). */
    public get provenanceNodes(): Map<string, NodeBinding> {
        if (this._provenanceNodes === null) {
            this._provenanceNodes = new Map();
        }
        return this._provenanceNodes;
    }
    /** Per-group dedup map for contributing relationship bindings (lazy). */
    public get provenanceRelationships(): Map<string, RelationshipBinding> {
        if (this._provenanceRels === null) {
            this._provenanceRels = new Map();
        }
        return this._provenanceRels;
    }
}

class GroupBy extends Projection {
    private _root: Node = new Node();
    private _current: Node = this._root;
    private _mappers: Expression[] | null = null;
    private _reducers: AggregateFunction[] | null = null;
    protected _where: Where | null = null;
    private _provenanceSites: ProvenanceSites | null = null;
    public async run(): Promise<void> {
        this.resetTree();
        this.map();
        this.reduce();
        this.recordProvenance();
    }
    /**
     * Register the provenance collector so each `run()` (one per match)
     * folds the current bindings into the active group's dedup maps.
     */
    public enableProvenance(sites: ProvenanceSites): void {
        this._provenanceSites = sites;
    }
    public get provenanceEnabled(): boolean {
        return this._provenanceSites !== null;
    }
    private recordProvenance(): void {
        if (this._provenanceSites === null) return;
        const snap = this._provenanceSites.snapshot();
        const nodeMap = this.current.provenanceNodes;
        for (const b of snap.nodes) {
            const k = nodeBindingKey(b);
            if (!nodeMap.has(k)) nodeMap.set(k, b);
        }
        const relMap = this.current.provenanceRelationships;
        for (const b of snap.relationships) {
            const k = relationshipBindingKey(b);
            if (!relMap.has(k)) relMap.set(k, b);
        }
    }
    private get root(): Node {
        return this._root;
    }
    private get current(): Node {
        return this._current;
    }
    private set current(node: Node) {
        this._current = node;
    }
    private resetTree() {
        this.current = this.root;
    }
    private map() {
        let node: Node = this.current;
        for (const mapper of this.mappers) {
            const value: any = mapper.value();
            const key: string =
                typeof value === "object" && value !== null ? JSON.stringify(value) : String(value);
            let child: Node | undefined = node.children.get(key);
            if (child === undefined) {
                child = new Node(value);
                node.children.set(key, child);
            }
            node = child;
        }
        this.current = node;
    }
    private reduce() {
        if (this.current.elements === null) {
            this.current.elements = this.reducers.map((reducer) => reducer.element());
        }
        const elements: AggregationElement[] = this.current.elements;
        this.reducers.forEach((reducer, index) => {
            reducer.reduce(elements[index]);
        });
    }
    private get mappers(): Expression[] {
        if (this._mappers === null) {
            this._mappers = [...this._generate_mappers()];
        }
        return this._mappers;
    }
    private *_generate_mappers(): Generator<Expression> {
        for (const [expression, _] of this.expressions()) {
            if (expression.mappable()) {
                yield expression;
            }
        }
    }
    private get reducers(): AggregateFunction[] {
        if (this._reducers === null) {
            this._reducers = this.children
                .map((child) => {
                    return (child as Expression).reducers();
                })
                .flat();
        }
        return this._reducers;
    }
    public *generate_results(
        mapperIndex: number = 0,
        node: Node = this.root
    ): Generator<Record<string, any>> {
        if (mapperIndex === 0 && node.children.size === 0 && this.mappers.length > 0) {
            return;
        }
        if (node.children.size > 0) {
            for (const child of node.children.values()) {
                this.mappers[mapperIndex].overridden = child.value;
                yield* this.generate_results(mapperIndex + 1, child);
            }
        } else {
            if (node.elements === null) {
                node.elements = this.reducers.map((reducer) => reducer.element());
            }
            node.elements.forEach((element, reducerIndex) => {
                this.reducers[reducerIndex].overridden = element.value;
            });
            const record: Record<string, any> = {};
            for (const [expression, alias] of this.expressions()) {
                record[alias] = expression.value();
            }
            if (this.where) {
                yield record;
            }
        }
    }
    /**
     * Walks the group tree in the same traversal order as
     * {@link generate_results}, yielding the materialised {@link
     * RowProvenance} for each emitted group.  When provenance is
     * disabled, yields empty entries so callers can still zip cleanly.
     */
    public *generate_provenance(
        mapperIndex: number = 0,
        node: Node = this.root
    ): Generator<RowProvenance> {
        if (mapperIndex === 0 && node.children.size === 0 && this.mappers.length > 0) {
            return;
        }
        if (node.children.size > 0) {
            for (const child of node.children.values()) {
                this.mappers[mapperIndex].overridden = child.value;
                yield* this.generate_provenance(mapperIndex + 1, child);
            }
        } else {
            if (node.elements === null) {
                node.elements = this.reducers.map((reducer) => reducer.element());
            }
            node.elements.forEach((element, reducerIndex) => {
                this.reducers[reducerIndex].overridden = element.value;
            });
            if (!this.where) return;
            yield {
                nodes: Array.from(node.provenanceNodes.values()),
                relationships: Array.from(node.provenanceRelationships.values()),
            };
        }
    }
    public set where(where: Where) {
        this._where = where;
    }
    public get where(): boolean {
        if (this._where === null) {
            return true;
        }
        return this._where.value();
    }
}

export default GroupBy;
