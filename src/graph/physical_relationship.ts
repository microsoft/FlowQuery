import ASTNode from "../parsing/ast_node";
import Relationship from "./relationship";
import type SourceContext from "./source_context";
import { RelationshipSourceProvider } from "./source_provider";
import { materializeScan } from "./statement_source";
import VirtualStatement from "./virtual_statement";

class PhysicalRelationship extends Relationship {
    private _virtual: VirtualStatement = new VirtualStatement();
    private _provider: RelationshipSourceProvider | null = null;

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
    /** Source provider serving this relationship, or `null` for legacy eager loading. */
    public get provider(): RelationshipSourceProvider | null {
        return this._provider;
    }
    public set provider(provider: RelationshipSourceProvider | null) {
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
            const sourceLabel = this.source?.label ?? null;
            const targetLabel = this.target?.label ?? null;
            return materializeScan(
                this._provider,
                "relationship",
                `(:${sourceLabel ?? ""})-[:${this.type}]->(:${targetLabel ?? ""})`,
                { type: this.type, sourceLabel, targetLabel },
                args,
                sourceContext
            );
        }
        return this._virtual.data(args, provenance, sourceContext);
    }
}

export default PhysicalRelationship;
