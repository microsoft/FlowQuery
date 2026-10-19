import ASTNode from "../parsing/ast_node";
import { namespaceOf, originMatches } from "./graph_records";
import Node from "./node";

class NodeReference extends Node {
    private _reference: ASTNode | null = null;
    constructor(base: Node, reference: ASTNode) {
        super();
        this._identifier = base.identifier;
        this._label = base.label;
        this._labels = base.labels;
        this._allLabels = base.allLabels;
        this._graph = base.graph;
        this._properties = base.properties;
        this._outgoing = base.outgoing;
        this._incoming = base.incoming;
        this._reference = reference;
    }
    public get reference(): ASTNode | null {
        return this._reference;
    }
    public async *next(): AsyncGenerator<void> {
        const referenced = this._reference?.value();
        if (referenced == null) {
            return;
        }
        this.setValue(referenced);
        if (this._outgoing) {
            yield* this._outgoing.find(this._value!.id, 0, namespaceOf(referenced));
        } else {
            yield;
        }
    }
    public async *find(id: string, hop: number = 0, origin?: string): AsyncGenerator<void> {
        const referenced = this._reference?.value();
        if (id !== referenced?.id || !originMatches(referenced, origin)) {
            return;
        }
        this.setValue(referenced!);
        if (this._outgoing) {
            yield* this._outgoing.find(this._value!.id, hop, namespaceOf(referenced));
        } else {
            yield;
        }
    }
}

export default NodeReference;
