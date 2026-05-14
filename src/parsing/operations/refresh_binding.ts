import Bindings from "../../graph/bindings";
import Operation from "./operation";

/**
 * `REFRESH BINDING name`: clear the cached value of a STATIC binding
 * so the next read re-executes the backing sub-query.  No-op for
 * non-STATIC bindings.
 */
class RefreshBinding extends Operation {
    private _name: string;

    constructor(name: string) {
        super();
        this._name = name;
    }

    public get name(): string {
        return this._name;
    }

    public async run(): Promise<void> {
        Bindings.getInstance().invalidate(this._name);
        await this.next?.run();
    }

    public get results(): Record<string, any>[] {
        return [];
    }
}

export default RefreshBinding;
