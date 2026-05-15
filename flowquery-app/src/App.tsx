import {
    FluentProvider,
    Input,
    Text,
    Toolbar,
    ToolbarButton,
    webLightTheme,
} from "@fluentui/react-components";
import React from "react";
import FlowQuery from "../../src/index.browser";
import { Compression } from "./compression";
import { CypherEditor } from "./CypherEditor";
import { ResultsTable } from "./ResultsTable";

function formatMetadataKey(key: string): string {
    return key
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

interface AppState {
    input: string;
    results: Record<string, unknown>[];
    metadata: Record<string, unknown> | null;
    error: string | null;
    shareLink: string;
}

export class App extends React.Component<Record<string, never>, AppState> {
    state: AppState = {
        input: "",
        results: [],
        metadata: null,
        error: null,
        shareLink: "",
    };

    componentDidMount() {
        const query = window.location.search;
        if (query && query.length > 1) {
            const compressed = query.substring(1);
            Compression.decompress(compressed)
                .then((statement) => {
                    this.setState({ input: statement });
                    const fq = new FlowQuery(statement);
                    fq.run()
                        .then(() => {
                            this.setState({ results: fq.results, metadata: fq.metadata });
                        })
                        .catch((e: unknown) => {
                            this.setState({ error: e instanceof Error ? e.message : String(e) });
                        });
                })
                .catch((e) => {
                    console.error("Failed to decompress URL query:", e);
                });
        }
    }

    run = async () => {
        this.setState({ error: null, results: [], metadata: null });
        try {
            const fq = new FlowQuery(this.state.input);
            await fq.run();
            this.setState({ results: fq.results, metadata: fq.metadata });
        } catch (e: unknown) {
            this.setState({ error: e instanceof Error ? e.message : String(e) });
        }
    };

    share = async () => {
        if (!this.state.input.trim()) return;
        const compressed = await Compression.compress(this.state.input);
        const url = window.location.origin + window.location.pathname + "?" + compressed;
        this.setState({ shareLink: url });
        navigator.clipboard.writeText(url).catch(() => {});
    };

    clear = () => {
        window.history.replaceState(null, "", window.location.pathname);
        this.setState({ input: "", results: [], metadata: null, error: null, shareLink: "" });
    };

    render() {
        const { input, results, metadata, error, shareLink } = this.state;

        return (
            <FluentProvider
                theme={webLightTheme}
                style={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100vh",
                    padding: 16,
                    boxSizing: "border-box",
                }}
            >
                <CypherEditor
                    value={input}
                    onChange={(v) => this.setState({ input: v })}
                    onShiftEnter={this.run}
                    placeholder="Type your FlowQuery statement here and press Shift+Enter to run it."
                />
                <Toolbar style={{ padding: "8px 0", gap: 4 }}>
                    <ToolbarButton appearance="primary" onClick={this.run}>
                        ▶ Run (Shift+Enter)
                    </ToolbarButton>
                    <ToolbarButton onClick={this.share}>
                        Share
                    </ToolbarButton>
                    <ToolbarButton onClick={this.clear}>
                        Clear
                    </ToolbarButton>
                    {shareLink && (
                        <Input
                            readOnly
                            value={shareLink}
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                            style={{ flexGrow: 1 }}
                        />
                    )}
                </Toolbar>
                {metadata && (
                    <div style={{ display: "flex", gap: 12, padding: "4px 0", flexWrap: "wrap" }}>
                        {Object.entries(metadata)
                            .filter(
                                ([, v]) =>
                                    v !== 0 &&
                                    v !== null &&
                                    (typeof v === "number" ||
                                        typeof v === "string" ||
                                        typeof v === "boolean")
                            )
                            .map(([k, v]) => (
                                <Text key={k} size={200} font="monospace">
                                    {formatMetadataKey(k)}: {String(v)}
                                </Text>
                            ))}
                    </div>
                )}
                {error && (
                    <Text style={{ color: "red", fontFamily: "monospace", padding: "4px 0" }}>
                        {error}
                    </Text>
                )}
                <div style={{ flexGrow: 1, overflowY: "auto", marginTop: 8 }}>
                    <ResultsTable results={results} />
                </div>
            </FluentProvider>
        );
    }
}
