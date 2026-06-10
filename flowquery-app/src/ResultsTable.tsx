import { tokens } from "@fluentui/react-components";
import { type CSSProperties, useMemo, useState } from "react";
import type { LineageReport, RowProvenance } from "../../src/index.browser";
import { LineageView } from "./LineageView";

type SortDirection = "ascending" | "descending";

function compareValues(a: unknown, b: unknown): number {
    // Push null/undefined to the end regardless of direction.
    const aNil = a === null || a === undefined;
    const bNil = b === null || b === undefined;
    if (aNil && bNil) return 0;
    if (aNil) return 1;
    if (bNil) return -1;

    if (typeof a === "number" && typeof b === "number") return a - b;
    if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);

    const aStr = typeof a === "object" ? JSON.stringify(a) : String(a);
    const bStr = typeof b === "object" ? JSON.stringify(b) : String(b);
    const aNum = Number(aStr);
    const bNum = Number(bStr);
    if (aStr.trim() !== "" && bStr.trim() !== "" && !Number.isNaN(aNum) && !Number.isNaN(bNum)) {
        return aNum - bNum;
    }
    return aStr.localeCompare(bStr, undefined, { numeric: true });
}

const scrollStyle: CSSProperties = { height: "100%", overflow: "auto", width: "100%" };

const tableStyle: CSSProperties = {
    borderCollapse: "collapse",
    width: "max-content",
    minWidth: "100%",
    fontFamily: tokens.fontFamilyBase,
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground1,
};

const thStyle: CSSProperties = {
    position: "sticky",
    top: 0,
    zIndex: 1,
    backgroundColor: tokens.colorNeutralBackground1,
    textAlign: "left",
    whiteSpace: "nowrap",
    cursor: "pointer",
    userSelect: "none",
    padding: "8px 12px",
    fontWeight: tokens.fontWeightSemibold,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
};

const tdStyle: CSSProperties = {
    whiteSpace: "nowrap",
    padding: "6px 12px",
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
};

export function ResultsTable({
    results,
    lineage,
    provenance,
}: {
    results: Record<string, unknown>[];
    lineage?: LineageReport | null;
    provenance?: RowProvenance[];
}) {
    const [selected, setSelected] = useState<{ rowIndex: number; column: string } | null>(null);
    const [sort, setSort] = useState<{ column: string; direction: SortDirection } | null>(null);

    const columns = results && results.length > 0 ? Object.keys(results[0]) : [];

    // Sort the rows while preserving a mapping back to the original index so
    // lineage/provenance lookups stay correct after sorting.
    const orderedRows = useMemo(() => {
        const indexed = (results ?? []).map((row, originalIndex) => ({ row, originalIndex }));
        if (!sort) return indexed;
        const dir = sort.direction === "ascending" ? 1 : -1;
        return [...indexed].sort(
            (a, b) => compareValues(a.row[sort.column], b.row[sort.column]) * dir
        );
    }, [results, sort]);

    if (!results || results.length === 0) return null;
    const clickable = !!lineage;

    const trace =
        selected && lineage ? (lineage.rows[selected.rowIndex]?.[selected.column] ?? null) : null;
    const rowProvenance = selected && provenance ? (provenance[selected.rowIndex] ?? null) : null;

    const toggleSort = (col: string) => {
        setSort((prev) => {
            if (!prev || prev.column !== col) return { column: col, direction: "ascending" };
            if (prev.direction === "ascending") return { column: col, direction: "descending" };
            return null;
        });
    };

    return (
        <>
            <div style={scrollStyle}>
                <table style={tableStyle}>
                    <thead>
                        <tr>
                            {columns.map((col) => {
                                const active = sort?.column === col;
                                return (
                                    <th
                                        key={col}
                                        onClick={() => toggleSort(col)}
                                        aria-sort={active ? sort.direction : "none"}
                                        style={thStyle}
                                    >
                                        {col}
                                        {active && (
                                            <span style={{ marginLeft: 4, opacity: 0.7 }}>
                                                {sort.direction === "ascending" ? "▲" : "▼"}
                                            </span>
                                        )}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {orderedRows.map(({ row, originalIndex }) => (
                            <tr key={originalIndex}>
                                {columns.map((col) => (
                                    <td
                                        key={col}
                                        onClick={
                                            clickable
                                                ? () =>
                                                      setSelected({
                                                          rowIndex: originalIndex,
                                                          column: col,
                                                      })
                                                : undefined
                                        }
                                        style={
                                            clickable
                                                ? { ...tdStyle, cursor: "pointer" }
                                                : tdStyle
                                        }
                                        title={clickable ? "Click to view lineage" : undefined}
                                    >
                                        {typeof row[col] === "object"
                                            ? JSON.stringify(row[col])
                                            : String(row[col] ?? "")}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {selected && (
                <LineageView
                    open={true}
                    onClose={() => setSelected(null)}
                    column={selected.column}
                    trace={trace}
                    rowProvenance={rowProvenance}
                />
            )}
        </>
    );
}
