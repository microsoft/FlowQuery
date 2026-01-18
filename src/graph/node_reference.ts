import Node from "./node";

class NodeReference extends Node {
    private _reference: Node | null = null;
    constructor(base: Node, reference: Node) {
        super();
        this._identifier = base.identifier;
        this._label = base.label;
        this._properties = base.properties;
        this._outgoing = base.outgoing;
        this._incoming = base.incoming;
        this._reference = reference;
    }
    public get reference(): Node | null {
        return this._reference;
    }
    public async next(): Promise<void> {
        this.setValue(this._reference!.value()!);
        await this._outgoing?.find(this._value!.id);
        await this.runTodoNext();
    }
    public async find(id: string, hop: number = 0): Promise<void> {
        const referenced = this._reference?.value();
        if (id !== referenced?.id) {
            return;
        }
        this.setValue(referenced!);
        await this._outgoing?.find(this._value!.id, hop);
        await this.runTodoNext();
    }
}

export default NodeReference;
