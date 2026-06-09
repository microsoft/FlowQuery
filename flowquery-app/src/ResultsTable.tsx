import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableHeaderCell,
    TableRow,
} from "@fluentui/react-components";
import { useState } from "react";
import type { LineageReport, RowProvenance } from "../../src/index.browser";
import { LineageView } from "./LineageView";

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
    if (!results || results.length === 0) return null;
    const columns = Object.keys(results[0]);
    const clickable = !!lineage;

    const trace =
        selected && lineage ? (lineage.rows[selected.rowIndex]?.[selected.column] ?? null) : null;
    const rowProvenance = selected && provenance ? (provenance[selected.rowIndex] ?? null) : null;

    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        {columns.map((col) => (
                            <TableHeaderCell key={col}>{col}</TableHeaderCell>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {results.map((row, i) => (
                        <TableRow key={i}>
                            {columns.map((col) => (
                                <TableCell
                                    key={col}
                                    onClick={
                                        clickable
                                            ? () => setSelected({ rowIndex: i, column: col })
                                            : undefined
                                    }
                                    style={clickable ? { cursor: "pointer" } : undefined}
                                    title={clickable ? "Click to view lineage" : undefined}
                                >
                                    {typeof row[col] === "object"
                                        ? JSON.stringify(row[col])
                                        : String(row[col] ?? "")}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
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
