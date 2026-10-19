import Database from "../../graph/database";
import DefaultGraph from "../../graph/default_graph";
import type SourceContext from "../../graph/source_context";
import AsyncFunction from "../functions/async_function";
import { declaredCapabilities, referencesRequest } from "./definition_backend";
import Operation from "./operation";

/** Base of the statements that change the registry's default graph. */
abstract class GraphBinding extends Operation {
    private _context: SourceContext | null = null;

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
     * keep the binding they pinned when they started.
     */
    protected bind(graph: DefaultGraph | null): void {
        Database.getInstance().defaultGraph = graph;
        if (this._context !== null) {
            this._context.graph = graph;
            // Routes resolved against the previous binding are stale.
            this._context.writes?.routes.clear();
        }
    }
    public get results(): Record<string, any>[] {
        return [];
    }
}

/**
 * `USE GRAPH fn($request, ...)`: bind `fn` as the default graph, replacing
 * any previous binding.  Labels and relationship types without a
 * `CREATE VIRTUAL` definition are then read and written through `fn`.
 * The function's capabilities are inferred once, here.
 */
export class UseGraph extends GraphBinding {
    constructor(private readonly _function: AsyncFunction) {
        super();
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
        const declared = await declaredCapabilities(
            { func, functionClass: func.constructor, name: func.name, requestIndex },
            { operation: "capabilities", graph: true }
        );
        const args = func
            .getChildren()
            .map((child, i) => (i === requestIndex ? null : child.value()));
        this.bind(new DefaultGraph(func.name, func.constructor, requestIndex, args, declared));
        await this.next?.run();
    }
}

/** `DROP GRAPH`: clear the default graph binding (no-op when none is bound). */
export class DropGraph extends GraphBinding {
    public async run(): Promise<void> {
        this.bind(null);
        await this.next?.run();
    }
}
