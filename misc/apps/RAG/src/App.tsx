import React, { useState, useEffect } from 'react';
import {
    FluentProvider,
    webLightTheme,
    Title3,
} from '@fluentui/react-components';
import { ApiKeySettings } from './components/ApiKeySettings';
import { FlowQueryRunner } from './components/FlowQueryRunner';
import { ChatContainer } from './components/ChatContainer';
import { generateFlowQuerySystemPrompt } from './prompts';
import './App.css';

const App: React.FC = () => {
    const [systemPrompt, setSystemPrompt] = useState<string>('');

    useEffect(() => {
        // Generate the system prompt after plugins are initialized
        const loadPrompt = async () => {
            const prompt = await generateFlowQuerySystemPrompt();
            setSystemPrompt(prompt);
        };
        loadPrompt();
    }, []);

    return (
        <FluentProvider theme={webLightTheme}>
            <div className="app-root">
                <div className="app-container">
                    <div className="app-header">
                        <Title3 as="h1">
                            FlowQuery Assistant
                        </Title3>
                        <div className="app-header-actions">
                            <FlowQueryRunner />
                            <ApiKeySettings />
                        </div>
                    </div>

                    <div className="chat-wrapper">
                        <ChatContainer
                            systemPrompt={systemPrompt}
                        />
                    </div>
                </div>
            </div>
        </FluentProvider>
    );
};

export default App;
