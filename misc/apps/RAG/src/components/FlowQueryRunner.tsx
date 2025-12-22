/**
 * FlowQuery Runner Component
 * 
 * A popup dialog that allows users to run FlowQuery statements directly
 * and see the results in the dialog.
 */

import React, { Component } from 'react';
import {
    Dialog,
    DialogTrigger,
    DialogSurface,
    DialogTitle,
    DialogBody,
    DialogActions,
    DialogContent,
    Button,
    Textarea,
    Label,
    Field,
    Spinner,
    Tooltip,
} from '@fluentui/react-components';
import { 
    Play24Regular, 
    Code24Regular, 
    Dismiss24Regular,
    Copy24Regular,
    ArrowClockwise24Regular,
    Checkmark24Regular,
} from '@fluentui/react-icons';
import { FlowQueryExecutor, FlowQueryExecutionResult } from '../utils/FlowQueryExecutor';
import './FlowQueryRunner.css';

const flowQueryExecutor = new FlowQueryExecutor();

interface FlowQueryRunnerProps {
    /** Initial query to pre-populate the input */
    initialQuery?: string;
    /** Controlled open state - if provided, the component becomes controlled */
    open?: boolean;
    /** Callback when open state changes (for controlled mode) */
    onOpenChange?: (open: boolean) => void;
    /** Callback when the dialog is closed (deprecated, use onOpenChange) */
    onClose?: () => void;
    /** Custom trigger element. If not provided, a default button is shown. Not used in controlled mode. */
    trigger?: React.ReactElement;
}

interface FlowQueryRunnerState {
    open: boolean;
    query: string;
    isExecuting: boolean;
    result: FlowQueryExecutionResult | null;
    copied: boolean;
}

export class FlowQueryRunner extends Component<FlowQueryRunnerProps, FlowQueryRunnerState> {
    constructor(props: FlowQueryRunnerProps) {
        super(props);
        this.state = {
            open: props.open ?? false,
            query: props.initialQuery || '',
            isExecuting: false,
            result: null,
            copied: false,
        };
    }

    componentDidUpdate(prevProps: FlowQueryRunnerProps): void {
        // Handle controlled mode: sync open state from props
        if (this.props.open !== undefined && this.props.open !== prevProps.open) {
            this.setState({ open: this.props.open });
            // If opening with a new initial query, update the query
            if (this.props.open && this.props.initialQuery !== prevProps.initialQuery) {
                this.setState({ query: this.props.initialQuery || '', result: null });
            }
        }
        // Handle initialQuery changes when opening
        if (this.props.initialQuery !== prevProps.initialQuery && this.props.open) {
            this.setState({ query: this.props.initialQuery || '', result: null });
        }
    }

    /**
     * Check if the component is in controlled mode
     */
    isControlled = (): boolean => {
        return this.props.open !== undefined;
    };

    handleOpenChange = (_: unknown, data: { open: boolean }): void => {
        if (this.isControlled()) {
            // In controlled mode, notify parent
            this.props.onOpenChange?.(data.open);
        } else {
            // In uncontrolled mode, manage state internally
            this.setState({ open: data.open });
        }
        
        if (!data.open && this.props.onClose) {
            this.props.onClose();
        }
    };

    handleClose = (): void => {
        if (this.isControlled()) {
            this.props.onOpenChange?.(false);
        } else {
            this.setState({ open: false });
        }
        this.props.onClose?.();
    };

    handleQueryChange = (_: unknown, data: { value: string }): void => {
        this.setState({ query: data.value });
    };

    handleExecute = async (): Promise<void> => {
        const { query } = this.state;
        
        if (!query.trim()) {
            return;
        }

        this.setState({ isExecuting: true, result: null });

        try {
            const result = await flowQueryExecutor.execute(query);
            this.setState({ result, isExecuting: false });
        } catch (error) {
            this.setState({
                result: {
                    success: false,
                    query,
                    error: error instanceof Error ? error.message : String(error),
                    executionTime: 0,
                },
                isExecuting: false,
            });
        }
    };

    handleClear = (): void => {
        this.setState({ query: '', result: null });
    };

    handleCopyResults = (): void => {
        const { result } = this.state;
        if (result?.success && result.results) {
            navigator.clipboard.writeText(JSON.stringify(result.results, null, 2));
            this.setState({ copied: true });
            setTimeout(() => this.setState({ copied: false }), 2000);
        }
    };

    handleKeyDown = (event: React.KeyboardEvent): void => {
        // Execute on Ctrl+Enter or Cmd+Enter
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            this.handleExecute();
        }
    };

    renderResults(): React.ReactNode {
        const { result, isExecuting, copied } = this.state;

        if (isExecuting) {
            return (
                <div className="flowquery-loading">
                    <Spinner size="tiny" />
                    <span>Executing query...</span>
                </div>
            );
        }

        if (!result) {
            return (
                <div className="flowquery-no-results">
                    Enter a FlowQuery statement and click Run to see results.
                </div>
            );
        }

        if (!result.success) {
            return (
                <pre className="flowquery-error">
                    Error: {result.error}
                </pre>
            );
        }

        const resultCount = result.results?.length || 0;
        const resultsJson = JSON.stringify(result.results, null, 2);

        return (
            <div className="flowquery-results-container">
                <div className="flowquery-results-header">
                    <span className="flowquery-results-count">
                        {resultCount} result{resultCount !== 1 ? 's' : ''} 
                        {' • '}
                        {result.executionTime.toFixed(2)}ms
                    </span>
                    <Tooltip 
                        content={copied ? "Copied!" : "Copy results"} 
                        relationship="label"
                    >
                        <Button
                            appearance="subtle"
                            icon={copied ? <Checkmark24Regular /> : <Copy24Regular />}
                            size="small"
                            onClick={this.handleCopyResults}
                            disabled={!result.results?.length}
                        />
                    </Tooltip>
                </div>
                <div className="flowquery-results">
                    <pre className="flowquery-results-content">
                        {resultsJson}
                    </pre>
                </div>
            </div>
        );
    }

    renderDialogSurface(): React.JSX.Element {
        const { query, isExecuting } = this.state;

        return (
            <DialogSurface className="flowquery-runner-surface">
                <DialogBody>
                    <DialogTitle
                        action={
                            <Button
                                appearance="subtle"
                                icon={<Dismiss24Regular />}
                                onClick={this.handleClose}
                            />
                        }
                    >
                        FlowQuery Runner
                    </DialogTitle>
                    <DialogContent className="flowquery-runner-content">
                        <div className="flowquery-input-container">
                            <Field label="FlowQuery Statement">
                                <Textarea
                                    value={query}
                                    onChange={this.handleQueryChange}
                                    onKeyDown={this.handleKeyDown}
                                    placeholder="Enter your FlowQuery statement here..."
                                    className="flowquery-textarea"
                                    resize="vertical"
                                />
                            </Field>
                            <div className="flowquery-actions">
                                <Tooltip content="Run query (Ctrl+Enter)" relationship="label">
                                    <Button
                                        appearance="primary"
                                        icon={<Play24Regular />}
                                        onClick={this.handleExecute}
                                        disabled={isExecuting || !query.trim()}
                                    >
                                        Run
                                    </Button>
                                </Tooltip>
                                <Tooltip content="Clear query and results" relationship="label">
                                    <Button
                                        appearance="subtle"
                                        icon={<ArrowClockwise24Regular />}
                                        onClick={this.handleClear}
                                        disabled={isExecuting}
                                    >
                                        Clear
                                    </Button>
                                </Tooltip>
                            </div>
                        </div>

                        <Field label="Results">
                            <div className="flowquery-results">
                                {this.renderResults()}
                            </div>
                        </Field>
                    </DialogContent>
                    <DialogActions>
                        <Button 
                            appearance="secondary" 
                            onClick={this.handleClose}
                        >
                            Close
                        </Button>
                    </DialogActions>
                </DialogBody>
            </DialogSurface>
        );
    }

    render(): React.ReactNode {
        const { open } = this.state;
        const { trigger } = this.props;
        const isControlled = this.isControlled();

        // In controlled mode, render dialog without trigger
        if (isControlled) {
            return (
                <Dialog open={open} onOpenChange={this.handleOpenChange}>
                    {this.renderDialogSurface()}
                </Dialog>
            );
        }

        // In uncontrolled mode, render with trigger
        return (
            <Dialog open={open} onOpenChange={this.handleOpenChange}>
                <DialogTrigger disableButtonEnhancement>
                    {trigger || (
                        <Button
                            appearance="subtle"
                            icon={<Code24Regular />}
                            title="FlowQuery Runner"
                        >
                            FlowQuery
                        </Button>
                    )}
                </DialogTrigger>
                {this.renderDialogSurface()}
            </Dialog>
        );
    }
}

export default FlowQueryRunner;
