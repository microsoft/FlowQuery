import Bindings from "../../graph/bindings";
import Operation from "./operation";

/**
 * `DROP BINDING name`: remove a `LET`-bound entry (STATIC or eager)
 * from the {@link Bindings} singleton.  No-op if the binding does not
 * exist.
 */
class DropBinding extends Operation {
    private _name: string;

    constructor(name: string) {
        super();
        this._name = name;
    }

    public get name(): string {
        return this._name;
    }

    public async run(): Promise<void> {
        Bindings.getInstance().delete(this._name);
        await this.next?.run();
    }

    public get results(): Record<string, any>[] {
        return [];
    }
}

export default DropBinding;
