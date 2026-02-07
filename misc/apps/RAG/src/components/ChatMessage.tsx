import React, { Component } from 'react';
import { Body1, Spinner, Button, Tooltip } from '@fluentui/react-components';
import { PersonFilled, BotFilled, Play16Regular } from '@fluentui/react-icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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

interface MessageContentProps {
    content: string;
    isStreaming?: boolean;
    showFlowQuery?: boolean;
}

interface MessageContentState {
    runnerQuery: string | null;
}

/**
 * Renders message content with FlowQuery code blocks enhanced with run buttons,
 * and optionally renders Adaptive Cards.
 */
class MessageContent extends Component<MessageContentProps, MessageContentState> {
    constructor(props: MessageContentProps) {
        super(props);
        this.state = {
            runnerQuery: null
        };
    }

    private setRunnerQuery = (query: string | null) => {
        this.setState({ runnerQuery: query });
    };

    private getFlowQueryBlocks(): string[] {
        return extractFlowQueryBlocks(this.props.content);
    }

    render() {
        const { content, isStreaming, showFlowQuery } = this.props;
        const { runnerQuery } = this.state;
        
        const flowQueryBlocks = this.getFlowQueryBlocks();

        // If there are no FlowQuery blocks, render markdown content
        if (flowQueryBlocks.length === 0) {
            return (
                <>
                    <div className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown></div>
                    {isStreaming && <Spinner size="tiny" className="streaming-indicator" />}
                </>
            );
        }

        // If FlowQuery blocks are hidden, render content without FlowQuery code blocks as markdown
        if (!showFlowQuery) {
            const contentWithoutFlowQuery = content.replace(/```flowquery\n[\s\S]*?```/gi, '').trim();
            return (
                <>
                    <div className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{contentWithoutFlowQuery}</ReactMarkdown></div>
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
            // Add text before the code block as markdown
            if (match.index > lastIndex) {
                const textSegment = content.slice(lastIndex, match.index);
                parts.push(
                    <div key={`text-${partIndex}`} className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{textSegment}</ReactMarkdown></div>
                );
            }

            const query = match[1]?.trim() || '';

            // Add the FlowQuery code block with a run button
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
                                    onClick={() => this.setRunnerQuery(query)}
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

        // Add remaining text after the last code block as markdown
        if (lastIndex < content.length) {
            const remainingText = content.slice(lastIndex);
            parts.push(
                <div key={`text-${partIndex}`} className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{remainingText}</ReactMarkdown></div>
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
                            if (!open) this.setRunnerQuery(null);
                        }}
                    />
                )}
            </>
        );
    }
}

interface ChatMessageState {
    showFlowQuery: boolean;
}

export class ChatMessage extends Component<ChatMessageProps, ChatMessageState> {
    constructor(props: ChatMessageProps) {
        super(props);
        this.state = {
            showFlowQuery: false
        };
    }

    private hasFlowQueryBlocks(): boolean {
        return /```flowquery\n[\s\S]*?```/gi.test(this.props.message.content);
    }

    private toggleFlowQuery = (): void => {
        this.setState(prev => ({ showFlowQuery: !prev.showFlowQuery }));
    };

    render() {
        const { message } = this.props;
        const { showFlowQuery } = this.state;
        const isUser = message.role === 'user';
        const hasFlowQuery = !isUser && this.hasFlowQueryBlocks();

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
                        {hasFlowQuery && (
                            <Tooltip content={showFlowQuery ? 'Hide FlowQuery' : 'Show FlowQuery'} relationship="label">
                                <button
                                    className={`flowquery-toggle-link ${showFlowQuery ? 'active' : ''}`}
                                    onClick={this.toggleFlowQuery}
                                    aria-label={showFlowQuery ? 'Hide FlowQuery code' : 'Show FlowQuery code'}
                                >
                                    &lt;/&gt;
                                </button>
                            </Tooltip>
                        )}
                    </div>
                    <div className="chat-message-text">
                        <MessageContent 
                            content={message.content} 
                            isStreaming={message.isStreaming}
                            showFlowQuery={showFlowQuery}
                        />
                    </div>
                </div>
            </div>
        );
    }
}
