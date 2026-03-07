import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableHeaderCell,
    TableRow,
} from "@fluentui/react-components";

export function ResultsTable({ results }: { results: Record<string, unknown>[] }) {
    if (!results || results.length === 0) return null;
    const columns = Object.keys(results[0]);
    return (
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
                            <TableCell key={col}>
                                {typeof row[col] === "object"
                                    ? JSON.stringify(row[col])
                                    : String(row[col] ?? "")}
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
