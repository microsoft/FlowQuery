import Projection from "./projection";

/**
 * Represents a WITH operation that defines variables or intermediate results.
 *
 * The WITH operation creates named expressions that can be referenced later in the query.
 * It passes control to the next operation in the chain.
 *
 * @example
 * ```typescript
 * // WITH x = 1, y = 2 RETURN x + y
 * ```
 */
class With extends Projection {
    public async run(): Promise<void> {
        await this.next?.run();
    }
    public get saturated(): boolean {
        return this.next?.saturated ?? false;
    }
}

export default With;
