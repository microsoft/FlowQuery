import Database from "../../graph/database";
import Node from "../../graph/node";
import { SOURCE_CONTRACT_VERSION, mergeCapabilities } from "../../graph/source_provider";
import ASTNode from "../ast_node";
import AssociativeArray from "../data_structures/associative_array";
import { declaredCapabilities, definitionBackend } from "./definition_backend";
import Operation from "./operation";

class CreateNode extends Operation {
    private _node: Node | null = null;
    private _statement: ASTNode | null = null;
    private _isStatic: boolean = false;
    private _refreshEveryMs: number | null = null;
    private _capabilities: AssociativeArray | null = null;
    constructor(
        node: Node,
        statement: ASTNode,
        isStatic: boolean = false,
        refreshEveryMs: number | null = null,
        capabilities: AssociativeArray | null = null
    ) {
        super();
        this._node = node;
        this._statement = statement;
        this._isStatic = isStatic;
        this._refreshEveryMs = refreshEveryMs;
        this._capabilities = capabilities;
    }
    public get node(): Node | null {
        return this._node;
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
     * function (`LOAD ... FROM fn($request)`), overridden by an explicit
     * `WITH CAPABILITIES` clause.  `null` keeps legacy eager loading.
     */
    public async effectiveCapabilities(): Promise<Record<string, any> | null> {
        const declared = await declaredCapabilities(definitionBackend(this._statement), {
            operation: "capabilities",
            label: this._node?.label ?? null,
        });
        return mergeCapabilities(declared, this.capabilities, "node");
    }
    public run(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                if (this._node === null) {
                    throw new Error("Node is null");
                }
                const db: Database = Database.getInstance();
                const capabilities = await this.effectiveCapabilities();
                db.addNode(this._node, this._statement!, this._isStatic, this._refreshEveryMs);
                if (capabilities !== null) {
                    try {
                        db.setNodeSourceCapabilities(this._node.label!, capabilities as any);
                    } catch (error) {
                        db.removeNode(this._node);
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

export default CreateNode;
