import Operation from "./operation";

class Limit extends Operation {
    private count: number = 0;
    private limit: number = 0;
    constructor(limit: number) {
        super();
        this.limit = limit;
    }
    public async run(): Promise<void> {
        if (this.count >= this.limit) {
            return;
        }
        this.count++;
        await this.next?.run();
    }
    public reset(): void {
        this.count = 0;
    }
}

export default Limit;