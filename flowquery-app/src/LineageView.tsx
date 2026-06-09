import {
    Dialog,
    DialogActions,
    DialogBody,
    DialogContent,
    DialogSurface,
    DialogTitle,
    Button,
    Text,
} from "@fluentui/react-components";
import { Dismiss24Regular } from "@fluentui/react-icons";
import React from "react";
import type { CellTrace, RowProvenance } from "../../src/index.browser";

/**
 * A single level in the lineage chain rendered by {@link LineageView}.
 * Levels nest via `children`: an output column is backed by node /
 * relationship bindings, which are in turn backed by the virtual
 * sub-query rows and, ultimately, the data sources they loaded from.
 */
interface LineageItem {
    kind: "column" | "node" | "relationship" | "source";
    /** Display title, e.g. `name`, `c:Company`, or a source URL. */
    title: string;
    /** Property name read off a node / relationship binding. */
    property?: string;
    /** The observed value at this level. */
    value?: unknown;
    /**
     * How many structurally-identical sibling chains were collapsed into
     * this one.  `1` (or absent) when unique; `>1` when an aggregate fed
     * the same backing chain from multiple input rows.  Rendered as a
     * `×N` badge.
     */
    count?: number;
    children: LineageItem[];
}

const KIND_STYLE: Record<LineageItem["kind"], { label: string; bg: string; fg: string }> = {
    column: { label: "COLUMN", bg: "#1565c0", fg: "#fff" },
    node: { label: "NODE", bg: "#2e7d32", fg: "#fff" },
    relationship: { label: "REL", bg: "#e65100", fg: "#fff" },
    source: { label: "SOURCE", bg: "#6a1b9a", fg: "#fff" },
};

function formatValue(value: unknown): string {
    if (value === undefined) return "";
    if (value === null) return "null";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
}

/**
 * Walk a provenance segment into the lineage items that back it: nested
 * node / relationship bindings (recursing through their own `source`
 * sub-query rows) and the data sources the segment loaded from.
 */
function buildSegment(seg: RowProvenance): LineageItem[] {
    const items: LineageItem[] = [];

    for (const n of seg.nodes) {
        if (n.source === undefined && n.properties === undefined) continue;
        items.push({
            kind: "node",
            title: n.alias ? `${n.alias}${n.label ? ":" + n.label : ""}` : (n.label ?? "node"),
            value: n.properties,
            children: n.source ? buildSegment(n.source) : [],
        });
    }

    for (const r of seg.relationships) {
        const hopSource = r.hops.find((h) => h.source !== undefined)?.source;
        if (hopSource === undefined && r.hops.length === 0) continue;
        items.push({
            kind: "relationship",
            title: r.alias ? `${r.alias}${r.type ? ":" + r.type : ""}` : (r.type ?? "relationship"),
            value: r.hops[0]?.properties,
            children: hopSource ? buildSegment(hopSource) : [],
        });
    }

    for (const ds of seg.data_sources ?? []) {
        items.push({
            kind: "source",
            title: ds.source,
            children: ds.source_provenance ? buildSegment(ds.source_provenance) : [],
        });
    }

    return items;
}

/**
 * A canonical structural key for a lineage item, ignoring `count`.  Two
 * items with the same key represent the same backing chain (same kind,
 * title, property, value, and recursively the same children) and can be
 * safely collapsed.
 */
function itemKey(item: LineageItem): string {
    return JSON.stringify([
        item.kind,
        item.title,
        item.property ?? null,
        formatValue(item.value),
        item.children.map(itemKey),
    ]);
}

/**
 * Collapse structurally-identical sibling chains into a single item with
 * a `count`, recursing depth-first so deeper duplicates are merged before
 * their parents are compared.  Preserves first-seen order.
 */
function dedupeItems(items: LineageItem[]): LineageItem[] {
    const order: string[] = [];
    const byKey = new Map<string, LineageItem>();
    for (const raw of items) {
        const item: LineageItem = { ...raw, children: dedupeItems(raw.children) };
        const key = itemKey(item);
        const existing = byKey.get(key);
        if (existing) {
            existing.count = (existing.count ?? 1) + (item.count ?? 1);
        } else {
            byKey.set(key, { ...item, count: item.count ?? 1 });
            order.push(key);
        }
    }
    return order.map((k) => byKey.get(k)!);
}

/**
 * Build the root lineage item for a clicked cell: the output column,
 * backed by its node / relationship bindings (or, for `LOAD`-only rows,
 * the row-level data sources).
 */
function buildChain(
    column: string,
    trace: CellTrace | null,
    rowProvenance: RowProvenance | null
): LineageItem {
    const root: LineageItem = {
        kind: "column",
        title: column,
        value: trace?.value,
        children: [],
    };

    if (trace && trace.bindings.length > 0) {
        for (const b of trace.bindings) {
            const ref = b.reference;
            const labels = ref.labels.length > 0 ? ":" + ref.labels.join("|") : "";
            const source =
                b.node?.source ?? b.relationship?.hops.find((h) => h.source !== undefined)?.source;
            root.children.push({
                kind: ref.kind,
                title: `${ref.alias}${labels}`,
                property: ref.property,
                value: b.value,
                children: source ? buildSegment(source) : [],
            });
        }
    } else if (rowProvenance) {
        root.children = buildSegment(rowProvenance);
    }

    root.children = dedupeItems(root.children);
    return root;
}

function LineageRow({ item, depth }: { item: LineageItem; depth: number }) {
    const style = KIND_STYLE[item.kind];
    const valueText = formatValue(item.value);
    return (
        <div
            style={{
                marginLeft: depth === 0 ? 0 : 14,
                borderLeft: depth === 0 ? "none" : "2px solid #e0e0e0",
                paddingLeft: depth === 0 ? 0 : 12,
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "5px 0",
                    flexWrap: "wrap",
                }}
            >
                <span
                    style={{
                        background: style.bg,
                        color: style.fg,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: 0.5,
                        padding: "2px 6px",
                        borderRadius: 4,
                        flexShrink: 0,
                    }}
                >
                    {style.label}
                </span>
                <Text weight="semibold" style={{ fontFamily: "monospace" }}>
                    {item.title}
                    {item.property ? "." + item.property : ""}
                </Text>
                {(item.count ?? 1) > 1 && (
                    <span
                        style={{
                            background: "#eceff1",
                            color: "#37474f",
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: 10,
                            flexShrink: 0,
                        }}
                        title={`${item.count} input rows shared this lineage`}
                    >
                        ×{item.count}
                    </span>
                )}
                {valueText !== "" && (
                    <Text
                        size={200}
                        style={{
                            fontFamily: "monospace",
                            opacity: 0.8,
                            maxWidth: 360,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                        title={valueText}
                    >
                        = {valueText}
                    </Text>
                )}
            </div>
            {item.children.length > 0 && (
                <div>
                    <Text size={200} style={{ opacity: 0.5, display: "block", paddingLeft: 2 }}>
                        ↑ backed by
                    </Text>
                    {item.children.map((child, i) => (
                        <LineageRow key={i} item={child} depth={depth + 1} />
                    ))}
                </div>
            )}
        </div>
    );
}

export function LineageView({
    open,
    onClose,
    column,
    trace,
    rowProvenance,
}: {
    open: boolean;
    onClose: () => void;
    column: string;
    trace: CellTrace | null;
    rowProvenance: RowProvenance | null;
}) {
    const root = React.useMemo(
        () => buildChain(column, trace, rowProvenance),
        [column, trace, rowProvenance]
    );
    const hasLineage = root.children.length > 0;

    return (
        <Dialog open={open} onOpenChange={(_, d) => !d.open && onClose()}>
            <DialogSurface style={{ maxWidth: 720 }}>
                <DialogBody>
                    <DialogTitle
                        action={
                            <Button
                                appearance="subtle"
                                aria-label="Close"
                                icon={<Dismiss24Regular />}
                                onClick={onClose}
                            />
                        }
                    >
                        Lineage of “{column}”
                    </DialogTitle>
                    <DialogContent>
                        <LineageRow item={root} depth={0} />
                        {!hasLineage && (
                            <Text
                                size={200}
                                style={{ display: "block", opacity: 0.7, paddingTop: 8 }}
                            >
                                No further lineage — this value is a literal or computed
                                expression with no backing data source.
                            </Text>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button appearance="primary" onClick={onClose}>
                            Close
                        </Button>
                    </DialogActions>
                </DialogBody>
            </DialogSurface>
        </Dialog>
    );
}
