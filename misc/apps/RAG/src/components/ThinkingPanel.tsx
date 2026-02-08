import React, { Component } from 'react';
import { Spinner, Button, Tooltip } from '@fluentui/react-components';
import { Play16Regular } from '@fluentui/react-icons';
import { ThinkingEntry } from './FlowQueryAgent';
import { FlowQueryRunner } from './FlowQueryRunner';
import './ThinkingPanel.css';

interface ThinkingPanelProps {
    entries: ThinkingEntry[];
    /** Whether the agent is still actively processing/retrying */
    isActive?: boolean;
}

interface ThinkingPanelState {
    isExpanded: boolean;
    /** Query to open in the FlowQuery runner */
    runnerQuery: string | null;
}

/**
 * A collapsible panel that shows the agent's reasoning/retry progress.
 * Displayed inline within the assistant message instead of as separate chat bubbles.
 */
export class ThinkingPanel extends Component<ThinkingPanelProps, ThinkingPanelState> {
    constructor(props: ThinkingPanelProps) {
        super(props);
        this.state = {
            isExpanded: false,
            runnerQuery: null,
        };
    }

    private getEntryIcon(type: ThinkingEntry['type']): string {
        switch (type) {
            case 'query_generated': return '📝';
            case 'query_executing': return '⏳';
            case 'query_succeeded': return '✅';
            case 'retry_start': return '🔄';
            case 'retry_error': return '⚠️';
            case 'retry_query': return '📝';
            case 'retry_success': return '✅';
            case 'retry_fail': return '❌';
            default: return '💭';
        }
    }

    /** Returns a final/overall summary for the header. */
    private getSummary(): string {
        const { entries, isActive } = this.props;
        if (entries.length === 0) return 'Thinking...';

        const retryStarts = entries.filter(e => e.type === 'retry_start');
        const hasQuerySuccess = entries.some(e => e.type === 'query_succeeded');
        const hasRetrySuccess = entries.some(e => e.type === 'retry_success');
        const hasFail = entries.some(e => e.type === 'retry_fail' && e.attempt === e.maxAttempts);
        
        if (isActive) {
            if (retryStarts.length > 0) {
                const currentRetry = retryStarts.length;
                const maxAttempts = entries.find(e => e.maxAttempts)?.maxAttempts ?? '?';
                return `Reasoning... (retry ${currentRetry}/${maxAttempts})`;
            }
            return 'Thinking...';
        }

        if (hasRetrySuccess) {
            return `Resolved after ${retryStarts.length} ${retryStarts.length === 1 ? 'retry' : 'retries'}`;
        }

        if (hasFail) {
            return `Failed after ${retryStarts.length} ${retryStarts.length === 1 ? 'retry' : 'retries'}`;
        }

        if (hasQuerySuccess) {
            return 'Query executed successfully';
        }

        return `${entries.length} reasoning steps`;
    }

    /** Returns a short live status from the latest entry, shown when collapsed. */
    private getLatestStatus(): string | null {
        const { entries, isActive } = this.props;
        if (!isActive || entries.length === 0) return null;

        const latest = entries[entries.length - 1];
        switch (latest.type) {
            case 'query_generated':
                return 'Generated FlowQuery';
            case 'query_executing':
                return 'Executing query...';
            case 'query_succeeded':
                return 'Query succeeded';
            case 'retry_error':
                return `Error: ${this.truncate(latest.detail || 'execution failed', 80)}`;
            case 'retry_start':
                return latest.label;
            case 'retry_query':
                return 'Generated corrected query';
            case 'retry_success':
                return 'Query succeeded';
            case 'retry_fail':
                return latest.label;
            default:
                return latest.label;
        }
    }

    private truncate(text: string, maxLen: number): string {
        return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
    }

    private toggleExpanded = (): void => {
        this.setState(prev => ({ isExpanded: !prev.isExpanded }));
    };

    private openRunner = (query: string): void => {
        this.setState({ runnerQuery: query });
    };

    private closeRunner = (): void => {
        this.setState({ runnerQuery: null });
    };

    /** Check if an entry has a runnable query */
    private isRunnableEntry(entry: ThinkingEntry): boolean {
        return !!entry.query && (
            entry.type === 'query_generated' ||
            entry.type === 'query_succeeded' ||
            entry.type === 'retry_query' ||
            entry.type === 'retry_success'
        );
    }

    render() {
        const { entries, isActive } = this.props;
        const { isExpanded, runnerQuery } = this.state;

        if (entries.length === 0) return null;

        const summary = this.getSummary();
        const latestStatus = this.getLatestStatus();

        return (
            <div className={`thinking-panel ${isActive ? 'thinking-panel-active' : 'thinking-panel-done'}`}>
                <button
                    className="thinking-panel-header"
                    onClick={this.toggleExpanded}
                    aria-expanded={isExpanded}
                    aria-label={`${summary} - click to ${isExpanded ? 'collapse' : 'expand'}`}
                >
                    <span className="thinking-panel-chevron">{isExpanded ? '▾' : '▸'}</span>
                    {isActive && <span className="thinking-panel-pulse" />}
                    <span className="thinking-panel-summary">{summary}</span>
                    {!isExpanded && latestStatus && (
                        <span className="thinking-panel-live-status">{latestStatus}</span>
                    )}
                    {!isExpanded && isActive && <Spinner size="extra-tiny" className="thinking-panel-spinner" />}
                </button>
                
                {isExpanded && (
                    <div className="thinking-panel-body">
                        <div className="thinking-panel-timeline">
                            {entries.map((entry) => (
                                <div key={entry.id} className={`thinking-entry thinking-entry-${entry.type}`}>
                                    <span className="thinking-entry-icon">{this.getEntryIcon(entry.type)}</span>
                                    <div className="thinking-entry-content">
                                        <div className="thinking-entry-header-row">
                                            <span className="thinking-entry-label">{entry.label}</span>
                                            {this.isRunnableEntry(entry) && (
                                                <Tooltip content="Open in FlowQuery Runner" relationship="label">
                                                    <Button
                                                        appearance="subtle"
                                                        size="small"
                                                        icon={<Play16Regular />}
                                                        className="thinking-entry-run-button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            this.openRunner(entry.query!);
                                                        }}
                                                    >
                                                        Run
                                                    </Button>
                                                </Tooltip>
                                            )}
                                        </div>
                                        {entry.detail && (
                                            <div className="thinking-entry-detail">
                                                {entry.type === 'retry_query' || entry.type === 'query_generated' ? (
                                                    <pre className="thinking-entry-code"><code>{entry.detail}</code></pre>
                                                ) : (
                                                    <span>{entry.detail}</span>
                                                )}
                                            </div>
                                        )}
                                        <span className="thinking-entry-time">
                                            {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {runnerQuery !== null && (
                    <FlowQueryRunner
                        initialQuery={runnerQuery}
                        open={true}
                        onOpenChange={(open) => {
                            if (!open) this.closeRunner();
                        }}
                    />
                )}
            </div>
        );
    }
}
