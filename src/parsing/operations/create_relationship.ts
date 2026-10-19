import Database from "../../graph/database";
import { qualifiedLabel } from "../../graph/namespaces";
import Relationship from "../../graph/relationship";
import { SOURCE_CONTRACT_VERSION, mergeCapabilities } from "../../graph/source_provider";
import ASTNode from "../ast_node";
import AssociativeArray from "../data_structures/associative_array";
import { declaredCapabilities, definitionBackend } from "./definition_backend";
import Operation from "./operation";

class CreateRelationship extends Operation {
    private _relationship: Relationship | null = null;
    private _statement: ASTNode | null = null;
    private _isStatic: boolean = false;
    private _refreshEveryMs: number | null = null;
    private _capabilities: AssociativeArray | null = null;
    constructor(
        relationship: Relationship,
        statement: ASTNode,
        isStatic: boolean = false,
        refreshEveryMs: number | null = null,
        capabilities: AssociativeArray | null = null
    ) {
        super();
        this._relationship = relationship;
        this._statement = statement;
        this._isStatic = isStatic;
        this._refreshEveryMs = refreshEveryMs;
        this._capabilities = capabilities;
    }
    public get relationship(): Relationship | null {
        return this._relationship;
    }
    public get statement(): ASTNode | null {
        return this._statement;
    }
    public get isStatic(): boolean {
        return this._isStatic;
    }
    public get refreshEveryMs(): number | null {
        return this._refreshEveryMs;
    }
    /** Source capabilities declared with `WITH CAPABILITIES { ... }`, if any. */
    public get capabilities(): Record<string, any> | null {
        if (this._capabilities === null) return null;
        return { version: SOURCE_CONTRACT_VERSION, ...this._capabilities.value() };
    }
    /**
     * Effective capabilities: those declared by the body's backend
     * function, overridden by an explicit `WITH CAPABILITIES` clause.
     */
    public async effectiveCapabilities(): Promise<Record<string, any> | null> {
        const declared = await declaredCapabilities(definitionBackend(this._statement), {
            operation: "capabilities",
            type: this._relationship?.type ?? null,
            sourceLabel: this._relationship?.source?.label ?? null,
            targetLabel: this._relationship?.target?.label ?? null,
        });
        return mergeCapabilities(declared, this.capabilities, "relationship");
    }
    public run(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                if (this._relationship === null) {
                    throw new Error("Relationship is null");
                }
                const db = Database.getInstance();
                const capabilities = await this.effectiveCapabilities();
                db.addRelationship(
                    this._relationship,
                    this._statement!,
                    this._isStatic,
                    this._refreshEveryMs
                );
                if (capabilities !== null) {
                    try {
                        db.setRelationshipSourceCapabilities(
                            this._relationship.type!,
                            qualifiedLabel(this._relationship.source),
                            qualifiedLabel(this._relationship.target),
                            capabilities as any
                        );
                    } catch (error) {
                        db.removeRelationship(this._relationship);
                        throw error;
                    }
                }
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }
    public get results(): Record<string, any>[] {
        return [];
    }
}
export default CreateRelationship;
