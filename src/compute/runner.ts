import Operation from "../parsing/operations/operation";
import Parser from "../parsing/parser";

class Runner {
    private first: Operation;
    private last: Operation;
    constructor(statement: string | null = null) {
        if(statement === null || statement === "") {
            throw new Error("Statement cannot be null or empty");
        }
        const parser = new Parser();
        const ast = parser.parse(statement);
        this.first = ast.firstChild() as Operation;
        this.last = ast.lastChild() as Operation;
    }
    public async run(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            try {
                await this.first.run();
                await this.first.finish();
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    }
    public get results(): any {
        return this.last.results;
    }
}

export default Runner;