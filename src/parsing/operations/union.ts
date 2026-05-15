import { RowProvenance } from "../../compute/provenance";
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
    protected _leftProvenance: RowProvenance[] | null = null;
    protected _rightProvenance: RowProvenance[] | null = null;
    protected _provenanceSink: RowProvenance[] | null = null;

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

    /**
     * Wire provenance through this UNION.  The Runner attaches each branch
     * to its own sink array; `sink` is the merged output array aligned with
     * `_results`.
     */
    public enableProvenance(
        leftSink: RowProvenance[],
        rightSink: RowProvenance[],
        sink: RowProvenance[]
    ): void {
        this._leftProvenance = leftSink;
        this._rightProvenance = rightSink;
        this._provenanceSink = sink;
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

        // Combine results (and provenance when enabled)
        const { rows, provenance } = this.combineWithProvenance(leftResults, rightResults);
        this._results = rows;
        if (this._provenanceSink !== null) {
            this._provenanceSink.length = 0;
            for (const p of provenance) this._provenanceSink.push(p);
        }
    }

    /**
     * Combines results from left and right pipelines and returns both the
     * merged rows and the merged provenance array (when enabled).  UNION
     * drops duplicates (first occurrence wins); subclass UnionAll overrides
     * to keep all rows.
     */
    protected combineWithProvenance(
        left: Record<string, any>[],
        right: Record<string, any>[]
    ): { rows: Record<string, any>[]; provenance: RowProvenance[] } {
        const leftProv = this._leftProvenance;
        const rightProv = this._rightProvenance;
        const wantProv = this._provenanceSink !== null;
        const rows: Record<string, any>[] = [...left];
        const provenance: RowProvenance[] = wantProv && leftProv !== null ? [...leftProv] : [];
        const serializedSeen = new Set<string>();
        for (const row of left) serializedSeen.add(JSON.stringify(row));
        for (let i = 0; i < right.length; i++) {
            const row = right[i];
            const serialized = JSON.stringify(row);
            if (!serializedSeen.has(serialized)) {
                rows.push(row);
                if (wantProv && rightProv !== null) {
                    provenance.push(rightProv[i]);
                }
                serializedSeen.add(serialized);
            }
        }
        return { rows, provenance };
    }

    /** Kept for backwards compatibility with subclasses that override only combine(). */
    protected combine(
        left: Record<string, any>[],
        right: Record<string, any>[]
    ): Record<string, any>[] {
        return this.combineWithProvenance(left, right).rows;
    }

    public async finish(): Promise<void> {
        await this.next?.finish();
    }

    public get results(): Record<string, any>[] {
        return this._results;
    }
}

export default Union;
