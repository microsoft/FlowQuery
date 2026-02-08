import React, { Component } from 'react';
import { Body1, Spinner } from '@fluentui/react-components';
import { PersonFilled, BotFilled } from '@fluentui/react-icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ThinkingPanel } from './ThinkingPanel';
import { ThinkingEntry } from './FlowQueryAgent';
import './ChatMessage.css';

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    isStreaming?: boolean;
    /** Thinking/reasoning entries for the collapsible thinking panel */
    thinkingEntries?: ThinkingEntry[];
    /** Whether the thinking process is still active */
    isThinking?: boolean;
}

interface ChatMessageProps {
    message: Message;
}

interface MessageContentProps {
    content: string;
    isStreaming?: boolean;
}

interface MessageContentState {}

/**
 * Renders message content as markdown, stripping FlowQuery code blocks
 * (those are shown in the ThinkingPanel instead).
 */
class MessageContent extends Component<MessageContentProps, MessageContentState> {
    constructor(props: MessageContentProps) {
        super(props);
        this.state = {};
    }

    render() {
        const { content, isStreaming } = this.props;

        // Strip FlowQuery code blocks — they are surfaced in the thinking panel
        const displayContent = content.replace(/```flowquery\n[\s\S]*?```/gi, '').trim();

        return (
            <>
                {displayContent && (
                    <div className="markdown-body">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent}</ReactMarkdown>
                    </div>
                )}
                {isStreaming && <Spinner size="tiny" className="streaming-indicator" />}
            </>
        );
    }
}

interface ChatMessageState {}

export class ChatMessage extends Component<ChatMessageProps, ChatMessageState> {
    constructor(props: ChatMessageProps) {
        super(props);
        this.state = {};
    }

    render() {
        const { message } = this.props;
        const isUser = message.role === 'user';
        const hasThinking = !isUser && message.thinkingEntries && message.thinkingEntries.length > 0;

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
                    {hasThinking && (
                        <ThinkingPanel
                            entries={message.thinkingEntries!}
                            isActive={message.isThinking}
                        />
                    )}
                    <div className="chat-message-text">
                        <MessageContent 
                            content={message.content} 
                            isStreaming={message.isStreaming}
                        />
                    </div>
                </div>
            </div>
        );
    }
}
