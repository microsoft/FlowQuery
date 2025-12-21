import React, { Component } from 'react';
import {
    FluentProvider,
    webLightTheme,
    Button,
    Textarea,
    Card,
    CardHeader,
    Title3,
    Body1,
    Spinner,
} from '@fluentui/react-components';
import { PlayFilled } from '@fluentui/react-icons';
import { FlowQuery } from 'flowquery';
import './App.css';

interface AppState {
    queryText: string;
    results: string;
    isLoading: boolean;
    error: string | null;
}

class App extends Component<{}, AppState> {
    state: AppState = {
        queryText: 'WITH 1 AS x RETURN x + 1',
        results: '',
        isLoading: false,
        error: null,
    };

    runQuery = async () => {
        this.setState({ isLoading: true, error: null, results: '' });

        try {
            const query = new FlowQuery(this.state.queryText);
            await query.run();
            this.setState({ results: JSON.stringify(query.results, null, 2) });
        } catch (err) {
            this.setState({
                error: err instanceof Error ? err.message : 'An error occurred',
            });
        } finally {
            this.setState({ isLoading: false });
        }
    };

    handleQueryChange = (e: React.ChangeEvent<HTMLTextAreaElement>, data: { value: string }) => {
        this.setState({ queryText: data.value });
    };

    render() {
        const { queryText, results, isLoading, error } = this.state;

        return (
            <FluentProvider theme={webLightTheme}>
                <div className="app-root">
                    <div className="app-container">
                        <Title3 as="h1" style={{ marginBottom: '24px' }}>
                            RAG FlowQuery App
                        </Title3>

                        <Card className="app-card">
                            <CardHeader header={<Body1><strong>Query</strong></Body1>} />
                            <Textarea
                                className="query-input"
                                value={queryText}
                                onChange={this.handleQueryChange}
                                placeholder="Enter your FlowQuery..."
                                resize="vertical"
                            />
                            <div className="button-row">
                                <Button
                                    appearance="primary"
                                    icon={<PlayFilled />}
                                    onClick={this.runQuery}
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Running...' : 'Run Query'}
                                </Button>
                            </div>
                        </Card>

                        <Card className="app-card">
                            <CardHeader header={<Body1><strong>Results</strong></Body1>} />
                            <div className="results-container">
                                {isLoading && <Spinner size="small" label="Running query..." />}
                                {error && <span className="error-text">Error: {error}</span>}
                                {!isLoading && !error && (results || 'Run a query to see results')}
                            </div>
                        </Card>
                    </div>
                </div>
            </FluentProvider>
        );
    }
}

export default App;
