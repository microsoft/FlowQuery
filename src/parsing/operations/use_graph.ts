import Database from "../../graph/database";
import DefaultGraph from "../../graph/default_graph";
import { DEFAULT_GRAPH } from "../../graph/graph_records";
import type SourceContext from "../../graph/source_context";
import AsyncFunction from "../functions/async_function";
import { declaredCapabilities, referencesRequest } from "./definition_backend";
import Operation from "./operation";

/** Base of the statements that change the registry's graph bindings. */
abstract class GraphBinding extends Operation {
    private _context: SourceContext | null = null;

    constructor(private readonly _name: string = DEFAULT_GRAPH) {
        super();
    }
    /** Name of the graph (`"default"` for the default graph). */
    public get name(): string {
        return this._name;
    }
    /** @internal Query context assigned by the runner. */
    public set sourceContext(ctx: SourceContext | null) {
        this._context = ctx;
    }
    public get sourceContext(): SourceContext | null {
        return this._context;
    }
    /**
     * Publish `graph` to the registry (queries started from now on) and to
     * the running query (its later statements).  Queries already running
     * keep the bindings they pinned when they started.
     */
    protected bind(graph: DefaultGraph | null): void {
        Database.getInstance().bindGraph(this._name, graph);
        if (this._context !== null) {
            if (graph === null) this._context.graphs.delete(this._name);
            else this._context.graphs.set(this._name, graph);
            // Routes resolved against the previous binding are stale.
            this._context.writes?.routes.clear();
        }
    }
    public get results(): Record<string, any>[] {
        return [];
    }
}

/**
 * `USE GRAPH [name =] fn($request, ...)`: bind `fn` as the default graph,
 * or as the graph `name`, replacing any previous binding of that name.
 * Labels and relationship types without a `CREATE VIRTUAL` definition are
 * then read and written through the default graph; labels qualified with
 * a graph name (`(:hr.Person)`) through that graph.  The function's
 * capabilities are inferred once, here.
 */
export class UseGraph extends GraphBinding {
    constructor(
        private readonly _function: AsyncFunction,
        name: string = DEFAULT_GRAPH
    ) {
        super(name);
        this.addChild(_function);
    }
    public get function(): AsyncFunction {
        return this._function;
    }
    public async run(): Promise<void> {
        const func = this._function;
        const requestIndex = func.getChildren().findIndex(referencesRequest);
        if (requestIndex < 0) {
            throw new Error(
                `USE GRAPH must pass $request to the backend function, e.g. USE GRAPH ${func.name}($request)`
            );
        }
        const request: Record<string, any> = { operation: "capabilities", graph: true };
        if (this.name !== DEFAULT_GRAPH) request.graphName = this.name;
        const declared = await declaredCapabilities(
            { func, functionClass: func.constructor, name: func.name, requestIndex },
            request
        );
        const args = func
            .getChildren()
            .map((child, i) => (i === requestIndex ? null : child.value()));
        this.bind(
            new DefaultGraph(func.name, func.constructor, requestIndex, args, declared, this.name)
        );
        await this.next?.run();
    }
}

/** `DROP GRAPH [name]`: clear a graph binding (no-op when it is not bound). */
export class DropGraph extends GraphBinding {
    public async run(): Promise<void> {
        this.bind(null);
        await this.next?.run();
    }
}
