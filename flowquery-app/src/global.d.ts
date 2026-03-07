declare class FlowQuery {
    results: Record<string, unknown>[];
    metadata: Record<string, unknown>;
    constructor(input: string);
    run(): Promise<void>;
}
