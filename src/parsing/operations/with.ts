import Projection from "./projection";

class With extends Projection {
    public async run(): Promise<void> {
        await this.next?.run();
    }
}

export default With;