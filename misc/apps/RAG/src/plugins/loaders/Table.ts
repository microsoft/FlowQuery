/**
 * Table plugin - transforms tabular data into Adaptive Card format.
 *
 * Adaptive Cards are platform-agnostic UI snippets that can be rendered in
 * Microsoft Teams, Outlook, Windows, and other applications.
 *
 * Usage in FlowQuery:
 *   // First collect data from an async provider, then pass to table:
 *   CALL mockUsers(5) YIELD id, name, email
 *   WITH collect({ id, name, email }) AS users
 *   CALL table(users, 'Users') YIELD type, body
 *
 * Note: Async providers cannot be nested as function arguments.
 */
import { AsyncFunction, FunctionDef } from "flowquery/extensibility";

/**
 * Interface for Adaptive Card structure
 */
interface AdaptiveCard {
    type: "AdaptiveCard";
    $schema: string;
    version: string;
    body: AdaptiveCardElement[];
}

interface AdaptiveCardElement {
    type: string;
    [key: string]: any;
}

interface TableCell {
    type: "TableCell";
    items: AdaptiveCardElement[];
}

interface TableRow {
    type: "TableRow";
    cells: TableCell[];
}

/**
 * Table class - transforms tabular data into an Adaptive Card table format.
 */
@FunctionDef({
    description: "Transforms tabular data into an Adaptive Card JSON format with a table layout",
    category: "async",
    parameters: [
        {
            name: "data",
            description: "Array of objects or async generator to display as a table",
            type: "array",
            required: true,
        },
        {
            name: "title",
            description: "Optional title for the card",
            type: "string",
            required: false,
            default: "Data Table",
        },
        {
            name: "columns",
            description:
                "Optional array of column names to include (defaults to all columns from first row)",
            type: "array",
            required: false,
        },
        {
            name: "maxRows",
            description: "Maximum number of rows to display",
            type: "number",
            required: false,
            default: 100,
        },
    ],
    output: {
        description: "Adaptive Card JSON object",
        type: "object",
        properties: {
            type: { description: 'Always "AdaptiveCard"', type: "string" },
            $schema: { description: "Adaptive Card schema URL", type: "string" },
            version: { description: "Adaptive Card version", type: "string" },
            body: { description: "Card body elements including table", type: "array" },
        },
    },
    examples: [
        "CALL mockUsers(5) YIELD id, name, email WITH collect({ id, name, email }) AS users CALL table(users, 'User List') YIELD type, body",
        "CALL mockProducts(10) YIELD name, price, category WITH collect({ name, price, category }) AS products CALL table(products, 'Products', ['name', 'price', 'category']) YIELD type, body",
    ],
})
export class Table extends AsyncFunction {
    /**
     * Transforms data into an Adaptive Card with table layout.
     *
     * @param data - Array or async iterable of objects
     * @param title - Card title
     * @param columns - Optional column names to include
     * @param maxRows - Maximum rows to include
     */
    async *generate(
        data: any[] | AsyncIterable<any>,
        title: string = "Data Table",
        columns?: string[],
        maxRows: number = 100
    ): AsyncGenerator<AdaptiveCard, void, unknown> {
        // Collect data from array or async iterable
        const rows: any[] = [];

        if (Symbol.asyncIterator in Object(data)) {
            for await (const item of data as AsyncIterable<any>) {
                rows.push(item);
                if (rows.length >= maxRows) break;
            }
        } else if (Array.isArray(data)) {
            rows.push(...data.slice(0, maxRows));
        } else {
            // Single object
            rows.push(data);
        }

        if (rows.length === 0) {
            yield this.createEmptyCard(title);
            return;
        }

        // Determine columns from first row if not specified
        const columnNames = columns || Object.keys(rows[0]);

        yield this.createTableCard(title, columnNames, rows);
    }

    /**
     * Creates an Adaptive Card with a table displaying the data.
     * Uses ColumnSet/Column for better compatibility across renderers.
     */
    private createTableCard(title: string, columnNames: string[], rows: any[]): AdaptiveCard {
        const card: AdaptiveCard = {
            type: "AdaptiveCard",
            $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
            version: "1.3",
            body: [],
        };

        // Add title
        card.body.push({
            type: "TextBlock",
            text: title,
            weight: "Bolder",
            size: "Large",
            wrap: true,
        });

        // Add separator
        card.body.push({
            type: "TextBlock",
            text: " ",
            separator: true,
        });

        // Create header row using ColumnSet
        const headerColumnSet: AdaptiveCardElement = {
            type: "ColumnSet",
            columns: columnNames.map((col) => ({
                type: "Column",
                width: "stretch",
                items: [
                    {
                        type: "TextBlock",
                        text: this.formatColumnName(col),
                        weight: "Bolder",
                        wrap: true,
                    },
                ],
            })),
            style: "accent",
        };
        card.body.push(headerColumnSet);

        // Add data rows using ColumnSets
        for (const row of rows) {
            const dataColumnSet: AdaptiveCardElement = {
                type: "ColumnSet",
                columns: columnNames.map((col) => ({
                    type: "Column",
                    width: "stretch",
                    items: [
                        {
                            type: "TextBlock",
                            text: this.formatCellValue(row[col]),
                            wrap: true,
                        },
                    ],
                })),
                separator: true,
            };
            card.body.push(dataColumnSet);
        }

        // Add row count footer
        card.body.push({
            type: "TextBlock",
            text: `Showing ${rows.length} row${rows.length !== 1 ? "s" : ""}`,
            size: "Small",
            isSubtle: true,
            horizontalAlignment: "Right",
            separator: true,
        });

        return card;
    }

    /**
     * Creates an empty card when no data is available.
     */
    private createEmptyCard(title: string): AdaptiveCard {
        return {
            type: "AdaptiveCard",
            $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
            version: "1.3",
            body: [
                {
                    type: "TextBlock",
                    text: title,
                    weight: "Bolder",
                    size: "Large",
                    wrap: true,
                },
                {
                    type: "TextBlock",
                    text: "No data available",
                    isSubtle: true,
                    wrap: true,
                },
            ],
        };
    }

    /**
     * Formats a column name for display (converts camelCase/snake_case to Title Case).
     */
    private formatColumnName(name: string): string {
        return name
            .replace(/([A-Z])/g, " $1") // camelCase
            .replace(/_/g, " ") // snake_case
            .replace(/^\w/, (c) => c.toUpperCase())
            .trim();
    }

    /**
     * Formats a cell value for display in the table.
     */
    private formatCellValue(value: any): string {
        if (value === null || value === undefined) {
            return "-";
        }
        if (typeof value === "boolean") {
            return value ? "✓" : "✗";
        }
        if (typeof value === "number") {
            // Format numbers nicely
            if (Number.isInteger(value)) {
                return value.toString();
            }
            return value.toFixed(2);
        }
        if (typeof value === "object") {
            return JSON.stringify(value);
        }
        return String(value);
    }
}

export { Table as default };
