import {
    FluentProvider,
    Input,
    Text,
    Textarea,
    Toolbar,
    ToolbarButton,
    webLightTheme,
} from "@fluentui/react-components";
import React from "react";
import { compressString, decompressString } from "./compression";
import { ResultsTable } from "./ResultsTable";

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
            decompressString(compressed)
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
        const compressed = await compressString(this.state.input);
        const url = window.location.origin + window.location.pathname + "?" + compressed;
        this.setState({ shareLink: url });
        navigator.clipboard.writeText(url).catch(() => {});
    };

    clear = () => {
        window.history.replaceState(null, "", window.location.pathname);
        this.setState({ input: "", results: [], metadata: null, error: null, shareLink: "" });
    };

    handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && e.shiftKey) {
            e.preventDefault();
            this.run();
        }
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
                <Textarea
                    value={input}
                    onChange={(_, d) => this.setState({ input: d.value })}
                    onKeyDown={this.handleKeyDown}
                    placeholder="Type your FlowQuery statement here and press Shift+Enter to run it."
                    resize="vertical"
                    textarea={{ style: { fontFamily: "monospace", minHeight: 200 } }}
                    style={{ width: "100%" }}
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
                    <div style={{ display: "flex", gap: 12, padding: "4px 0" }}>
                        {Object.entries(metadata).map(([k, v]) => (
                            <Text key={k} size={200} font="monospace">
                                {k}: {String(v)}
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
