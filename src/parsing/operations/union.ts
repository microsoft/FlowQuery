import Operation from "./operation";

/**
 * Represents a UNION operation that combines results from two sub-queries.
 *
 * UNION merges the results of a left and right query pipeline, removing
 * duplicate rows. Both sides must return the same column names.
 *
 * @example
 * ```
 * WITH 1 AS x RETURN x
 * UNION
 * WITH 2 AS x RETURN x
 * // Results: [{x: 1}, {x: 2}]
 * ```
 */
class Union extends Operation {
    protected _left: Operation | null = null;
    protected _right: Operation | null = null;
    protected _results: Record<string, any>[] = [];

    public set left(operation: Operation) {
        this._left = operation;
    }
    public get left(): Operation {
        if (!this._left) {
            throw new Error("Left operation is not set");
        }
        return this._left;
    }
    public set right(operation: Operation) {
        this._right = operation;
    }
    public get right(): Operation {
        if (!this._right) {
            throw new Error("Right operation is not set");
        }
        return this._right;
    }

    private lastInChain(operation: Operation): Operation {
        let current = operation;
        while (current.next) {
            current = current.next;
        }
        return current;
    }

    public async initialize(): Promise<void> {
        this._results = [];
        await this.next?.initialize();
    }

    public async run(): Promise<void> {
        // Execute left pipeline
        await this._left!.initialize();
        await this._left!.run();
        await this._left!.finish();
        const leftLast = this.lastInChain(this._left!);
        const leftResults: Record<string, any>[] = leftLast.results;

        // Execute right pipeline
        await this._right!.initialize();
        await this._right!.run();
        await this._right!.finish();
        const rightLast = this.lastInChain(this._right!);
        const rightResults: Record<string, any>[] = rightLast.results;

        // Validate column names match
        if (leftResults.length > 0 && rightResults.length > 0) {
            const leftKeys = Object.keys(leftResults[0]).sort().join(",");
            const rightKeys = Object.keys(rightResults[0]).sort().join(",");
            if (leftKeys !== rightKeys) {
                throw new Error(
                    "All sub queries in a UNION must have the same return column names"
                );
            }
        }

        // Combine results
        this._results = this.combine(leftResults, rightResults);
    }

    /**
     * Combines results from left and right pipelines.
     * UNION removes duplicates; subclass UnionAll overrides to keep all rows.
     */
    protected combine(
        left: Record<string, any>[],
        right: Record<string, any>[]
    ): Record<string, any>[] {
        const combined = [...left];
        for (const row of right) {
            const serialized = JSON.stringify(row);
            const isDuplicate = combined.some(
                (existing) => JSON.stringify(existing) === serialized
            );
            if (!isDuplicate) {
                combined.push(row);
            }
        }
        return combined;
    }

    public async finish(): Promise<void> {
        await this.next?.finish();
    }

    public get results(): Record<string, any>[] {
        return this._results;
    }
}

export default Union;
