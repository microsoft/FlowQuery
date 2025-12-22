import React, { useState, useMemo } from 'react';
import { Body1, Spinner, Button, Tooltip } from '@fluentui/react-components';
import { PersonFilled, BotFilled, Play16Regular } from '@fluentui/react-icons';
import { FlowQueryRunner } from './FlowQueryRunner';
import './ChatMessage.css';

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    isStreaming?: boolean;
}

interface ChatMessageProps {
    message: Message;
}

/**
 * Extract FlowQuery code blocks from markdown content.
 * Looks for ```flowquery ... ``` code blocks.
 */
function extractFlowQueryBlocks(content: string): string[] {
    const regex = /```flowquery\n([\s\S]*?)```/gi;
    const matches: string[] = [];
    let match;
    
    while ((match = regex.exec(content)) !== null) {
        if (match[1]?.trim()) {
            matches.push(match[1].trim());
        }
    }
    
    return matches;
}

/**
 * Renders message content with FlowQuery code blocks enhanced with run buttons.
 */
const MessageContent: React.FC<{ content: string; isStreaming?: boolean }> = ({ content, isStreaming }) => {
    const [runnerQuery, setRunnerQuery] = useState<string | null>(null);
    
    const flowQueryBlocks = useMemo(() => extractFlowQueryBlocks(content), [content]);
    
    // If there are no FlowQuery blocks, render plain content
    if (flowQueryBlocks.length === 0) {
        return (
            <>
                {content}
                {isStreaming && <Spinner size="tiny" className="streaming-indicator" />}
            </>
        );
    }
    
    // Split content by FlowQuery code blocks and render with buttons
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const regex = /```flowquery\n([\s\S]*?)```/gi;
    let match;
    let partIndex = 0;
    
    while ((match = regex.exec(content)) !== null) {
        // Add text before the code block
        if (match.index > lastIndex) {
            parts.push(
                <span key={`text-${partIndex}`}>
                    {content.slice(lastIndex, match.index)}
                </span>
            );
        }
        
        const query = match[1]?.trim() || '';
        
        // Add the code block with a run button and </> link
        parts.push(
            <div key={`code-${partIndex}`} className="flowquery-code-block">
                <div className="flowquery-code-header">
                    <span className="flowquery-code-label">flowquery</span>
                    <div className="flowquery-code-actions">
                        <Tooltip content="Run in FlowQuery Runner" relationship="label">
                            <Button
                                appearance="subtle"
                                size="small"
                                icon={<Play16Regular />}
                                className="flowquery-run-button"
                                onClick={() => setRunnerQuery(query)}
                            >
                                Run
                            </Button>
                        </Tooltip>
                    </div>
                </div>
                <pre className="flowquery-code-content">
                    <code>{query}</code>
                </pre>
            </div>
        );
        
        lastIndex = match.index + match[0].length;
        partIndex++;
    }
    
    // Add remaining text after the last code block
    if (lastIndex < content.length) {
        parts.push(
            <span key={`text-${partIndex}`}>
                {content.slice(lastIndex)}
            </span>
        );
    }
    
    return (
        <>
            {parts}
            {isStreaming && <Spinner size="tiny" className="streaming-indicator" />}
            {runnerQuery !== null && (
                <FlowQueryRunner
                    initialQuery={runnerQuery}
                    open={true}
                    onOpenChange={(open) => {
                        if (!open) setRunnerQuery(null);
                    }}
                />
            )}
        </>
    );
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
    const isUser = message.role === 'user';

    return (
        <div className={`chat-message ${isUser ? 'chat-message-user' : 'chat-message-assistant'}`}>
            <div className="chat-message-avatar">
                {isUser ? <PersonFilled /> : <BotFilled />}
            </div>
            <div className="chat-message-content">
                <div className="chat-message-header">
                    <Body1 className="chat-message-role">
                        {isUser ? 'You' : 'Assistant'}
                    </Body1>
                    <span className="chat-message-time">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
                <div className="chat-message-text">
                    <MessageContent content={message.content} isStreaming={message.isStreaming} />
                </div>
            </div>
        </div>
    );
};
