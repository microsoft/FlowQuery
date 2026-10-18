import SourceContext, { contextOf } from "./source_context";
import {
    NodeSourceCapabilities,
    RelationshipSourceCapabilities,
    SourceReadContext,
    SourceRow,
} from "./source_provider";
import type VirtualStatement from "./virtual_statement";

/**
 * Adapts a `CREATE VIRTUAL` definition to the source provider contract.
 *
 * The definition is opted in with explicit capabilities; every request
 * runs the inner statement with `$request` bound to the request envelope
 * (`operation`, `label`/`type`, `ids`, `side`, `predicate`, `pageSize`)
 * while `$args` keeps its legacy meaning.  Statements that ignore part
 * of the request remain correct because FlowQuery re-checks every row.
 */
export class StatementSourceProvider {
    constructor(
        private readonly _virtual: VirtualStatement,
        public readonly capabilities: NodeSourceCapabilities & RelationshipSourceCapabilities
    ) {}
    private _run(request: Record<string, any>, context: SourceReadContext): any {
        return this._virtual.request(
            request,
            this.capabilities.streaming === true,
            contextOf(context)
        );
    }
    public scan(request: any, context: SourceReadContext): any {
        return this._run(request, context);
    }
    public lookup(request: any, context: SourceReadContext): any {
        return this._run(request, context);
    }
    public expand(request: any, context: SourceReadContext): any {
        return this._run(request, context);
    }
}

/**
 * Fully read a provider's scan (legacy eager paths: schema
 * introspection, pattern expressions and mixed legacy/provider patterns).
 */
export async function materializeScan(
    provider: any,
    kind: "node" | "relationship",
    name: string,
    base: Record<string, any>,
    args: Record<string, any> | null,
    ctx: SourceContext | null
): Promise<SourceRow[]> {
    const context = ctx ?? new SourceContext();
    try {
        context.stats.materializations++;
        const rows: SourceRow[] = [];
        for await (const page of context.call(provider, "scan", name, kind, {
            operation: "scan",
            ...base,
            predicate: null,
            args,
            pageSize: context.options.pageSize,
        })) {
            rows.push(...page);
        }
        return rows;
    } finally {
        if (ctx === null) await context.close();
    }
}
