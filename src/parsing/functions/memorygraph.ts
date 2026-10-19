import MemoryGraphStore from "../../graph/memory_graph_store";
import { PREDICATE_OPERATORS } from "../../graph/source_provider";
import AsyncFunction from "./async_function";
import { FunctionDef } from "./function_metadata";

/** One query's view of a named store: a snapshot, plus a private copy once it writes. */
interface Transaction {
    base: MemoryGraphStore;
    copy: MemoryGraphStore | null;
}

interface QuerySnapshot {
    transactions: Map<string, Transaction>;
}

/**
 * Built-in in-memory graph store and adapter.  Bind it as the default
 * graph to create, merge, match, update and delete arbitrary nodes and
 * relationships without any other setup:
 *
 * ```
 * USE GRAPH memorygraph($request)
 * ```
 *
 * `memorygraph($request, 'name')` selects a separate named store (the
 * default store is `'default'`).  Stores live in the process for as long
 * as it runs; they are not persisted.
 *
 * Each query reads one consistent snapshot and writes to a private copy
 * (`transactions: true`), so it reads its own writes and its changes
 * become visible to other queries when it commits.  A commit fails when
 * another query committed to the same store in the meantime.
 */
@FunctionDef({
    description:
        "Built-in in-memory graph store. Bind it as the default graph with USE GRAPH memorygraph($request); memorygraph($request, 'name') uses a separate named store.",
    category: "async",
    parameters: [
        { name: "request", description: "The backend request ($request)", type: "object" },
        {
            name: "store",
            description: "Name of the store (default 'default')",
            type: "string",
            required: false,
        },
    ],
    output: { description: "Graph rows or write results", type: "object" },
    examples: ["USE GRAPH memorygraph($request)", "USE GRAPH memorygraph($request, 'scratch')"],
})
class MemoryGraph extends AsyncFunction {
    static capabilities = {
        lookup: true,
        expand: true,
        streaming: true,
        cacheable: true,
        predicates: { operators: [...PREDICATE_OPERATORS], stringOrdering: "binary" },
        writes: true,
        transactions: true,
    };
    private static _stores: Map<string, MemoryGraphStore> = new Map();

    /** The committed state of a named store (created empty on first use). */
    public static store(name: string = "default"): MemoryGraphStore {
        let store = MemoryGraph._stores.get(name);
        if (store === undefined) {
            store = new MemoryGraphStore();
            MemoryGraph._stores.set(name, store);
        }
        return store;
    }
    /** Discard a named store, or every store when no name is given. */
    public static clear(name?: string): void {
        if (name === undefined) MemoryGraph._stores.clear();
        else MemoryGraph._stores.delete(name);
    }
    static openReadContext(): QuerySnapshot {
        return { transactions: new Map() };
    }

    constructor() {
        super("memorygraph");
    }

    private transaction(name: string): Transaction | null {
        const snapshot = this.context?.snapshot as QuerySnapshot | undefined;
        if (snapshot === undefined || !(snapshot.transactions instanceof Map)) return null;
        let tx = snapshot.transactions.get(name);
        if (tx === undefined) {
            tx = { base: MemoryGraph.store(name), copy: null };
            snapshot.transactions.set(name, tx);
        }
        return tx;
    }

    public async *generate(request: any, name: string = "default"): AsyncGenerator<any> {
        if (request === null || typeof request !== "object" || request.graph !== true) {
            throw new Error(
                "memorygraph serves the default graph: bind it with USE GRAPH memorygraph($request)"
            );
        }
        const storeName = String(name ?? "default");
        const tx = this.transaction(storeName);
        switch (request.operation) {
            case "write": {
                if (tx === null) {
                    const next = MemoryGraph.store(storeName).clone();
                    const outcome = next.apply(request.changes ?? []);
                    MemoryGraph._stores.set(storeName, next);
                    yield outcome;
                    return;
                }
                tx.copy ??= tx.base.clone();
                yield tx.copy.apply(request.changes ?? []);
                return;
            }
            case "commit": {
                if (tx !== null && tx.copy !== null) {
                    if (MemoryGraph._stores.get(storeName) !== tx.base) {
                        throw new Error(
                            `memorygraph store '${storeName}' was changed by another query; retry the query`
                        );
                    }
                    MemoryGraph._stores.set(storeName, tx.copy);
                    tx.base = tx.copy;
                    tx.copy = null;
                }
                yield {};
                return;
            }
            case "rollback": {
                if (tx !== null) tx.copy = null;
                yield {};
                return;
            }
            default: {
                const store = tx?.copy ?? tx?.base ?? MemoryGraph.store(storeName);
                for (const row of store.read(request)) yield row;
            }
        }
    }
}

export default MemoryGraph;
