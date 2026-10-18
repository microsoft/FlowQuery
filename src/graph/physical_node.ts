import ASTNode from "../parsing/ast_node";
import Node from "./node";
import type SourceContext from "./source_context";
import { NodeSourceProvider } from "./source_provider";
import { materializeScan } from "./statement_source";
import VirtualStatement from "./virtual_statement";

class PhysicalNode extends Node {
    private _virtual: VirtualStatement = new VirtualStatement();
    private _provider: NodeSourceProvider | null = null;

    public set statement(statement: ASTNode | null) {
        this._virtual.statement = statement;
    }
    public get statement(): ASTNode | null {
        return this._virtual.statement;
    }
    /** @internal The backing statement wrapper (for capability opt-in). */
    public get virtual(): VirtualStatement {
        return this._virtual;
    }
    /** Source provider serving this label, or `null` for legacy eager loading. */
    public get provider(): NodeSourceProvider | null {
        return this._provider;
    }
    public set provider(provider: NodeSourceProvider | null) {
        this._provider = provider;
    }
    public set isStatic(value: boolean) {
        this._virtual.isStatic = value;
    }
    public get isStatic(): boolean {
        return this._virtual.isStatic;
    }
    public set refreshEveryMs(value: number | null) {
        this._virtual.refreshEveryMs = value;
    }
    public get refreshEveryMs(): number | null {
        return this._virtual.refreshEveryMs;
    }
    public invalidateCache(): void {
        this._virtual.invalidateCache();
    }
    public data(
        args: Record<string, any> | null = null,
        provenance: boolean = false,
        sourceContext: SourceContext | null = null
    ): Promise<Record<string, any>[]> {
        if (this._virtual.statement === null && this._provider !== null) {
            return materializeScan(
                this._provider,
                "node",
                this.label ?? "",
                { label: this.label },
                args,
                sourceContext
            );
        }
        return this._virtual.data(args, provenance, sourceContext);
    }
}

export default PhysicalNode;
