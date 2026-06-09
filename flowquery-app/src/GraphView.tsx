import {
    Button,
    Dialog,
    DialogActions,
    DialogBody,
    DialogContent,
    DialogSurface,
    DialogTitle,
    Spinner,
    Text,
} from "@fluentui/react-components";
import { Dismiss24Regular } from "@fluentui/react-icons";
import React from "react";
import FlowQuery from "../../src/index.browser";

interface GraphNode {
    key: string;
    label: string;
    properties: string[];
    x: number;
    y: number;
    vx: number;
    vy: number;
    fixed?: boolean;
}

interface GraphEdge {
    source: string;
    target: string;
    type: string;
    properties: string[];
}

interface GraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

// A small, color-blind-friendly palette assigned per node label.
const PALETTE = [
    "#4F6BED",
    "#107C10",
    "#C239B3",
    "#CA5010",
    "#038387",
    "#8764B8",
    "#A4262C",
    "#986F0B",
    "#005B70",
    "#4894FE",
];

function toStringList(value: unknown): string[] {
    if (Array.isArray(value)) return value.map((v) => String(v));
    return [];
}

/** Backtick-quotes an identifier (label) for safe interpolation into a query. */
function escapeIdent(name: string): string {
    return "`" + String(name).replace(/`/g, "``") + "`";
}

/** Maximum number of data rows to display when a node label is selected. */
const SAMPLE_LIMIT = 50;

/**
 * Fetches the rows backing a given node label by matching all of its instances
 * and returning their properties. Returns a bounded sample plus the total count.
 */
async function fetchLabelData(
    label: string
): Promise<{ rows: Record<string, unknown>[]; total: number }> {
    const q = new FlowQuery(`MATCH (n:${escapeIdent(label)}) RETURN properties(n) AS props`);
    await q.run();
    const rows = q.results.map((r) => (r.props ?? {}) as Record<string, unknown>);
    return { rows: rows.slice(0, SAMPLE_LIMIT), total: rows.length };
}

/**
 * Builds the virtual graph *schema* from the global FlowQuery database via the
 * built-in schema() function: each registered node label becomes a node and
 * each relationship type becomes an edge between its endpoint labels.
 */
async function fetchGraph(): Promise<GraphData> {
    const schemaQ = new FlowQuery(
        "CALL schema() YIELD kind, label, type, from_label, to_label, properties " +
            "RETURN kind, label, type, from_label, to_label, properties"
    );
    await schemaQ.run();

    const nodeMap = new Map<string, GraphNode>();
    const ensureNode = (label: string, properties: string[] = []): GraphNode => {
        const key = `label\u0000${label}`;
        let node = nodeMap.get(key);
        if (!node) {
            node = {
                key,
                label,
                properties,
                x: 0,
                y: 0,
                vx: 0,
                vy: 0,
            };
            nodeMap.set(key, node);
        } else if (properties.length > 0 && node.properties.length === 0) {
            node.properties = properties;
        }
        return node;
    };

    const edges: GraphEdge[] = [];
    for (const r of schemaQ.results) {
        if (r.kind === "Node") {
            const label = String(r.label ?? "");
            if (label) ensureNode(label, toStringList(r.properties));
        } else if (r.kind === "Relationship") {
            const type = String(r.type ?? "");
            const from = r.from_label != null ? String(r.from_label) : null;
            const to = r.to_label != null ? String(r.to_label) : null;
            if (!type || !from || !to) continue;
            const source = ensureNode(from);
            const target = ensureNode(to);
            edges.push({
                source: source.key,
                target: target.key,
                type,
                properties: toStringList(r.properties),
            });
        }
    }

    return { nodes: [...nodeMap.values()], edges };
}

const WIDTH = 900;
const HEIGHT = 600;
const NODE_RADIUS = 16;

interface GraphViewProps {
    open: boolean;
    onClose: () => void;
}

interface GraphViewState {
    loading: boolean;
    error: string | null;
    data: GraphData | null;
    tick: number;
    transform: { scale: number; tx: number; ty: number };
    selectedLabel: string | null;
    sampleLoading: boolean;
    sampleError: string | null;
    sampleRows: Record<string, unknown>[] | null;
    sampleTotal: number;
}

export class GraphView extends React.Component<GraphViewProps, GraphViewState> {
    state: GraphViewState = {
        loading: false,
        error: null,
        data: null,
        tick: 0,
        transform: { scale: 1, tx: 0, ty: 0 },
        selectedLabel: null,
        sampleLoading: false,
        sampleError: null,
        sampleRows: null,
        sampleTotal: 0,
    };

    private animationFrame: number | null = null;
    private colorMap = new Map<string, string>();
    private svgEl: SVGSVGElement | null = null;
    private dragKey: string | null = null;
    private downNodeKey: string | null = null;
    private pointerDownPos = { x: 0, y: 0 };
    private dragMoved = false;
    private panning = false;
    private lastPointer = { x: 0, y: 0 };
    private selectToken = 0;

    componentDidUpdate(prev: GraphViewProps) {
        if (this.props.open && !prev.open) {
            this.load();
        }
        if (!this.props.open && prev.open) {
            this.stopSimulation();
        }
    }

    componentWillUnmount() {
        this.stopSimulation();
        if (this.svgEl) {
            this.svgEl.removeEventListener("wheel", this.onWheel);
        }
    }

    // Callback ref: attach a *non-passive* wheel listener so we can preventDefault.
    // React's synthetic onWheel is passive, which blocks preventDefault and would
    // let the dialog body scroll while zooming.
    private setSvgRef = (el: SVGSVGElement | null) => {
        if (this.svgEl === el) return;
        if (this.svgEl) {
            this.svgEl.removeEventListener("wheel", this.onWheel);
        }
        this.svgEl = el;
        if (el) {
            el.addEventListener("wheel", this.onWheel, { passive: false });
        }
    };

    private colorFor(label: string): string {
        if (!this.colorMap.has(label)) {
            this.colorMap.set(label, PALETTE[this.colorMap.size % PALETTE.length]);
        }
        return this.colorMap.get(label)!;
    }

    private async load() {
        this.setState({
            loading: true,
            error: null,
            data: null,
            transform: { scale: 1, tx: 0, ty: 0 },
            selectedLabel: null,
            sampleLoading: false,
            sampleError: null,
            sampleRows: null,
            sampleTotal: 0,
        });
        try {
            const data = await fetchGraph();
            // Seed positions on a circle so the simulation untangles cleanly.
            const n = data.nodes.length;
            data.nodes.forEach((node, i) => {
                const angle = (2 * Math.PI * i) / Math.max(1, n);
                node.x = WIDTH / 2 + Math.cos(angle) * 200;
                node.y = HEIGHT / 2 + Math.sin(angle) * 200;
                node.vx = 0;
                node.vy = 0;
            });
            this.setState({ loading: false, data }, () => this.startSimulation());
        } catch (e: unknown) {
            this.setState({
                loading: false,
                error: e instanceof Error ? e.message : String(e),
            });
        }
    }

    private startSimulation() {
        this.stopSimulation();
        const step = () => {
            const settled = this.simulateStep();
            this.setState((s) => ({ tick: s.tick + 1 }));
            if (!settled) {
                this.animationFrame = requestAnimationFrame(step);
            } else {
                this.animationFrame = null;
            }
        };
        this.animationFrame = requestAnimationFrame(step);
    }

    private stopSimulation() {
        if (this.animationFrame !== null) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    /** One force-directed layout iteration. Returns true when settled. */
    private simulateStep(): boolean {
        const data = this.state.data;
        if (!data) return true;
        const { nodes, edges } = data;
        const k = 0.01; // spring stiffness
        const repulsion = 9000;
        const center = 0.005;
        const damping = 0.85;
        const idealLength = 90;

        for (let i = 0; i < nodes.length; i++) {
            const a = nodes[i];
            if (a.fixed) continue;
            let fx = 0;
            let fy = 0;
            // Repulsion from every other node.
            for (let j = 0; j < nodes.length; j++) {
                if (i === j) continue;
                const b = nodes[j];
                let dx = a.x - b.x;
                let dy = a.y - b.y;
                let distSq = dx * dx + dy * dy;
                if (distSq < 0.01) {
                    dx = Math.random() - 0.5;
                    dy = Math.random() - 0.5;
                    distSq = 0.01;
                }
                const dist = Math.sqrt(distSq);
                const force = repulsion / distSq;
                fx += (dx / dist) * force;
                fy += (dy / dist) * force;
            }
            // Pull toward center.
            fx += (WIDTH / 2 - a.x) * center;
            fy += (HEIGHT / 2 - a.y) * center;
            a.vx = (a.vx + fx) * damping;
            a.vy = (a.vy + fy) * damping;
        }

        // Spring attraction along edges.
        const index = new Map(nodes.map((nd) => [nd.key, nd]));
        for (const e of edges) {
            const a = index.get(e.source);
            const b = index.get(e.target);
            if (!a || !b) continue;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
            const force = k * (dist - idealLength);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            if (!a.fixed) {
                a.vx += fx;
                a.vy += fy;
            }
            if (!b.fixed) {
                b.vx -= fx;
                b.vy -= fy;
            }
        }

        let maxV = 0;
        for (const nd of nodes) {
            if (nd.fixed) continue;
            nd.x += nd.vx;
            nd.y += nd.vy;
            maxV = Math.max(maxV, Math.abs(nd.vx), Math.abs(nd.vy));
        }
        return maxV < 0.15;
    }

    private toSvgPoint(clientX: number, clientY: number): { x: number; y: number } {
        const svg = this.svgEl;
        if (!svg) return { x: clientX, y: clientY };
        const ctm = svg.getScreenCTM();
        if (!ctm) return { x: clientX, y: clientY };
        const pt = svg.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        const local = pt.matrixTransform(ctm.inverse());
        const { scale, tx, ty } = this.state.transform;
        return { x: (local.x - tx) / scale, y: (local.y - ty) / scale };
    }

    /** Converts client coordinates to SVG viewBox coordinates (before the pan/zoom group transform). */
    private toViewBoxPoint(clientX: number, clientY: number): { x: number; y: number } {
        const svg = this.svgEl;
        if (!svg) return { x: clientX, y: clientY };
        const ctm = svg.getScreenCTM();
        if (!ctm) return { x: clientX, y: clientY };
        const pt = svg.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        const local = pt.matrixTransform(ctm.inverse());
        return { x: local.x, y: local.y };
    }

    private onNodePointerDown = (e: React.PointerEvent, key: string) => {
        e.stopPropagation();
        (e.target as Element).setPointerCapture?.(e.pointerId);
        this.dragKey = key;
        this.downNodeKey = key;
        this.pointerDownPos = { x: e.clientX, y: e.clientY };
        this.dragMoved = false;
        const node = this.state.data?.nodes.find((n) => n.key === key);
        if (node) node.fixed = true;
    };

    private onBackgroundPointerDown = (e: React.PointerEvent) => {
        this.panning = true;
        this.lastPointer = { x: e.clientX, y: e.clientY };
        (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    };

    private onPointerMove = (e: React.PointerEvent) => {
        if (this.dragKey) {
            if (!this.dragMoved) {
                const dx = e.clientX - this.pointerDownPos.x;
                const dy = e.clientY - this.pointerDownPos.y;
                if (dx * dx + dy * dy > 16) this.dragMoved = true;
            }
            const node = this.state.data?.nodes.find((n) => n.key === this.dragKey);
            if (node) {
                const p = this.toSvgPoint(e.clientX, e.clientY);
                node.x = p.x;
                node.y = p.y;
                node.vx = 0;
                node.vy = 0;
                this.setState((s) => ({ tick: s.tick + 1 }));
                if (this.animationFrame === null) this.startSimulation();
            }
        } else if (this.panning) {
            const dx = e.clientX - this.lastPointer.x;
            const dy = e.clientY - this.lastPointer.y;
            this.lastPointer = { x: e.clientX, y: e.clientY };
            this.setState((s) => ({
                transform: { ...s.transform, tx: s.transform.tx + dx, ty: s.transform.ty + dy },
            }));
        }
    };

    private onPointerUp = () => {
        const clickedKey = this.downNodeKey;
        const wasClick = clickedKey !== null && !this.dragMoved;
        if (this.dragKey) {
            const node = this.state.data?.nodes.find((n) => n.key === this.dragKey);
            if (node) node.fixed = false;
            this.dragKey = null;
            if (this.animationFrame === null) this.startSimulation();
        }
        this.downNodeKey = null;
        this.panning = false;
        if (wasClick) {
            const node = this.state.data?.nodes.find((n) => n.key === clickedKey);
            if (node) this.selectNode(node.label);
        }
    };

    private async selectNode(label: string) {
        const token = ++this.selectToken;
        this.setState({
            selectedLabel: label,
            sampleLoading: true,
            sampleError: null,
            sampleRows: null,
            sampleTotal: 0,
        });
        try {
            const { rows, total } = await fetchLabelData(label);
            if (token !== this.selectToken) return;
            this.setState({ sampleLoading: false, sampleRows: rows, sampleTotal: total });
        } catch (e: unknown) {
            if (token !== this.selectToken) return;
            this.setState({
                sampleLoading: false,
                sampleError: e instanceof Error ? e.message : String(e),
            });
        }
    }

    private closePanel = () => {
        this.selectToken++;
        this.setState({
            selectedLabel: null,
            sampleLoading: false,
            sampleError: null,
            sampleRows: null,
            sampleTotal: 0,
        });
    };

    private renderDataPanel() {
        const { selectedLabel, sampleLoading, sampleError, sampleRows, sampleTotal } = this.state;
        if (!selectedLabel) return null;

        const columns = sampleRows
            ? [...new Set(sampleRows.flatMap((r) => Object.keys(r)))]
            : [];
        const shown = sampleRows ? sampleRows.length : 0;

        return (
            <div
                style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    bottom: 8,
                    width: "min(48%, 440px)",
                    background: "#fff",
                    border: "1px solid #e0e0e0",
                    borderRadius: 6,
                    boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 10px",
                        borderBottom: "1px solid #eee",
                    }}
                >
                    <span
                        style={{
                            width: 12,
                            height: 12,
                            borderRadius: 6,
                            background: this.colorFor(selectedLabel),
                            display: "inline-block",
                            flexShrink: 0,
                        }}
                    />
                    <Text weight="semibold">{selectedLabel}</Text>
                    {!sampleLoading && !sampleError && (
                        <Text size={200} style={{ opacity: 0.7 }}>
                            {sampleTotal > shown
                                ? `showing ${shown} of ${sampleTotal} rows`
                                : `${sampleTotal} row${sampleTotal === 1 ? "" : "s"}`}
                        </Text>
                    )}
                    <Button
                        appearance="subtle"
                        size="small"
                        aria-label="Close data panel"
                        icon={<Dismiss24Regular />}
                        onClick={this.closePanel}
                        style={{ marginLeft: "auto" }}
                    />
                </div>
                <div style={{ overflow: "auto", padding: "4px 0" }}>
                    {sampleLoading && (
                        <div style={{ padding: 24, textAlign: "center" }}>
                            <Spinner size="small" label="Loading data…" />
                        </div>
                    )}
                    {sampleError && (
                        <Text
                            style={{
                                color: "red",
                                fontFamily: "monospace",
                                display: "block",
                                padding: 12,
                            }}
                        >
                            {sampleError}
                        </Text>
                    )}
                    {!sampleLoading && !sampleError && sampleRows && sampleRows.length === 0 && (
                        <Text style={{ display: "block", padding: 12, opacity: 0.7 }}>
                            No rows.
                        </Text>
                    )}
                    {!sampleLoading && !sampleError && sampleRows && sampleRows.length > 0 && (
                        <table
                            style={{
                                borderCollapse: "collapse",
                                fontSize: 12,
                                width: "100%",
                            }}
                        >
                            <thead>
                                <tr>
                                    {columns.map((col) => (
                                        <th
                                            key={col}
                                            style={{
                                                textAlign: "left",
                                                padding: "4px 8px",
                                                borderBottom: "1px solid #ddd",
                                                position: "sticky",
                                                top: 0,
                                                background: "#fafafa",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sampleRows.map((row, i) => (
                                    <tr key={i}>
                                        {columns.map((col) => {
                                            const v = row[col];
                                            return (
                                                <td
                                                    key={col}
                                                    style={{
                                                        padding: "4px 8px",
                                                        borderBottom: "1px solid #f0f0f0",
                                                        verticalAlign: "top",
                                                        maxWidth: 220,
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                    title={
                                                        typeof v === "object" && v !== null
                                                            ? JSON.stringify(v)
                                                            : String(v ?? "")
                                                    }
                                                >
                                                    {typeof v === "object" && v !== null
                                                        ? JSON.stringify(v)
                                                        : String(v ?? "")}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        );
    }

    private onWheel = (e: WheelEvent) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        // Anchor the zoom on the pointer so the graph doesn't drift while scaling.
        const anchor = this.toViewBoxPoint(e.clientX, e.clientY);
        this.setState((s) => {
            const scale = Math.min(4, Math.max(0.2, s.transform.scale * factor));
            const ratio = scale / s.transform.scale;
            // Keep the point under the cursor fixed:
            //   anchor = tx + scale * model  =>  newTx = anchor - ratio * (anchor - tx)
            const tx = anchor.x - ratio * (anchor.x - s.transform.tx);
            const ty = anchor.y - ratio * (anchor.y - s.transform.ty);
            return { transform: { scale, tx, ty } };
        });
    };

    render() {
        const { open, onClose } = this.props;
        const { loading, error, data, transform } = this.state;
        const index = data ? new Map(data.nodes.map((n) => [n.key, n])) : new Map();
        const labels = data ? [...new Set(data.nodes.map((n) => n.label))] : [];

        return (
            <Dialog open={open} onOpenChange={(_, d) => !d.open && onClose()}>
                <DialogSurface style={{ maxWidth: "95vw", width: WIDTH + 80 }}>
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
                            Graph Schema
                        </DialogTitle>
                        <DialogContent>
                            {loading && (
                                <div style={{ padding: 40, textAlign: "center" }}>
                                    <Spinner label="Loading graph…" />
                                </div>
                            )}
                            {error && (
                                <Text style={{ color: "red", fontFamily: "monospace" }}>
                                    {error}
                                </Text>
                            )}
                            {!loading && !error && data && data.nodes.length === 0 && (
                                <Text>
                                    No virtual graph schema is currently registered. Run a query
                                    that uses <code>CREATE VIRTUAL</code> and try again.
                                </Text>
                            )}
                            {!loading && !error && data && data.nodes.length > 0 && (
                                <>
                                    <div
                                        style={{
                                            display: "flex",
                                            gap: 12,
                                            flexWrap: "wrap",
                                            padding: "4px 0 8px",
                                        }}
                                    >
                                        {labels.map((label) => (
                                            <span
                                                key={label}
                                                style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: 4,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        width: 12,
                                                        height: 12,
                                                        borderRadius: 6,
                                                        background: this.colorFor(label),
                                                        display: "inline-block",
                                                    }}
                                                />
                                                <Text size={200}>{label}</Text>
                                            </span>
                                        ))}
                                        <Text size={200} style={{ marginLeft: "auto", opacity: 0.7 }}>
                                            {data.nodes.length} labels · {data.edges.length}{" "}
                                            relationship types · drag to move, scroll to zoom
                                        </Text>
                                    </div>
                                    <svg
                                        ref={this.setSvgRef}
                                        width="100%"
                                        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                                        style={{
                                            border: "1px solid #e0e0e0",
                                            borderRadius: 6,
                                            background: "#fafafa",
                                            touchAction: "none",
                                            cursor: this.panning ? "grabbing" : "grab",
                                        }}
                                        onPointerDown={this.onBackgroundPointerDown}
                                        onPointerMove={this.onPointerMove}
                                        onPointerUp={this.onPointerUp}
                                    >
                                        <defs>
                                            <marker
                                                id="arrow"
                                                viewBox="0 0 10 10"
                                                refX="9"
                                                refY="5"
                                                markerWidth="6"
                                                markerHeight="6"
                                                orient="auto-start-reverse"
                                            >
                                                <path d="M 0 0 L 10 5 L 0 10 z" fill="#999" />
                                            </marker>
                                        </defs>
                                        <g
                                            transform={`translate(${transform.tx} ${transform.ty}) scale(${transform.scale})`}
                                        >
                                            {data.edges.map((e, i) => {
                                                const a = index.get(e.source);
                                                const b = index.get(e.target);
                                                if (!a || !b) return null;
                                                const dx = b.x - a.x;
                                                const dy = b.y - a.y;
                                                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                                                const ux = dx / dist;
                                                const uy = dy / dist;
                                                const x2 = b.x - ux * NODE_RADIUS;
                                                const y2 = b.y - uy * NODE_RADIUS;
                                                const mx = (a.x + b.x) / 2;
                                                const my = (a.y + b.y) / 2;
                                                return (
                                                    <g key={i}>
                                                        <line
                                                            x1={a.x}
                                                            y1={a.y}
                                                            x2={x2}
                                                            y2={y2}
                                                            stroke="#999"
                                                            strokeWidth={1.2}
                                                            markerEnd="url(#arrow)"
                                                        />
                                                        <text
                                                            x={mx}
                                                            y={my}
                                                            fontSize={9}
                                                            fill="#777"
                                                            textAnchor="middle"
                                                            dy={-2}
                                                        >
                                                            {e.type}
                                                        </text>
                                                    </g>
                                                );
                                            })}
                                            {data.nodes.map((node) => (
                                                <g
                                                    key={node.key}
                                                    transform={`translate(${node.x} ${node.y})`}
                                                    style={{ cursor: "pointer" }}
                                                    onPointerDown={(ev) =>
                                                        this.onNodePointerDown(ev, node.key)
                                                    }
                                                >
                                                    <title>
                                                        {`${node.label}` +
                                                            (node.properties.length > 0
                                                                ? `\nProperties: ${node.properties.join(
                                                                      ", "
                                                                  )}`
                                                                : "")}
                                                    </title>
                                                    <circle
                                                        r={NODE_RADIUS}
                                                        fill={this.colorFor(node.label)}
                                                        stroke="#fff"
                                                        strokeWidth={2}
                                                    />
                                                    <text
                                                        y={NODE_RADIUS + 12}
                                                        fontSize={11}
                                                        fill="#333"
                                                        textAnchor="middle"
                                                        fontWeight={600}
                                                    >
                                                        {node.label.length > 18
                                                            ? node.label.slice(0, 17) + "…"
                                                            : node.label}
                                                    </text>
                                                    {node.properties.length > 0 && (
                                                        <text
                                                            y={NODE_RADIUS + 24}
                                                            fontSize={9}
                                                            fill="#777"
                                                            textAnchor="middle"
                                                        >
                                                            {(() => {
                                                                const joined =
                                                                    node.properties.join(", ");
                                                                return joined.length > 28
                                                                    ? joined.slice(0, 27) + "…"
                                                                    : joined;
                                                            })()}
                                                        </text>
                                                    )}
                                                </g>
                                            ))}
                                        </g>
                                    </svg>
                                </>
                            )}
                        </DialogContent>
                        <DialogActions>
                            <Button appearance="secondary" onClick={onClose}>
                                Close
                            </Button>
                        </DialogActions>
                    </DialogBody>
                </DialogSurface>
            </Dialog>
        );
    }
}
