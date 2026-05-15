import ASTNode from "../parsing/ast_node";
import Relationship from "./relationship";
import VirtualStatement from "./virtual_statement";

class PhysicalRelationship extends Relationship {
    private _virtual: VirtualStatement = new VirtualStatement();

    public set statement(statement: ASTNode | null) {
        this._virtual.statement = statement;
    }
    public get statement(): ASTNode | null {
        return this._virtual.statement;
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
        deep: boolean = false,
        properties: boolean = false
    ): Promise<Record<string, any>[]> {
        return this._virtual.data(args, deep, properties);
    }
}

export default PhysicalRelationship;
