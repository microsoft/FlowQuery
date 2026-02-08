import Expression from "../expressions/expression";
import AggregateFunction from "../functions/aggregate_function";
import AggregationElement from "../functions/reducer_element";
import Projection from "./projection";
import Where from "./where";

class Node {
    private _value: any;
    private _children: Map<string, Node> = new Map();
    private _elements: AggregationElement[] | null = null;
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
}

class GroupBy extends Projection {
    private _root: Node = new Node();
    private _current: Node = this._root;
    private _mappers: Expression[] | null = null;
    private _reducers: AggregateFunction[] | null = null;
    protected _where: Where | null = null;
    public async run(): Promise<void> {
        this.resetTree();
        this.map();
        this.reduce();
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
            let child: Node | undefined = node.children.get(value);
            if (child === undefined) {
                child = new Node(value);
                node.children.set(value, child);
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
            node.elements?.forEach((element, reducerIndex) => {
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
