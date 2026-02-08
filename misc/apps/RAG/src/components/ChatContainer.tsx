import React, { Component, createRef, RefObject } from 'react';
import { Spinner } from '@fluentui/react-components';
import { ChatMessage, Message } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { FlowQueryAgent, ThinkingEntry } from './FlowQueryAgent';
import { getMaxRetries } from './ApiKeySettings';
import './ChatContainer.css';

interface ChatContainerProps {
    systemPrompt?: string;
    /** Whether to show intermediate steps (query generation, execution) */
    showIntermediateSteps?: boolean;
}

interface ChatContainerState {
    messages: Message[];
    isLoading: boolean;
    error: string | null;
}

export class ChatContainer extends Component<ChatContainerProps, ChatContainerState> {
    static defaultProps: Partial<ChatContainerProps> = {
        systemPrompt: 'You are a helpful assistant. Be concise and informative in your responses.',
        showIntermediateSteps: true
    };

    private readonly agent = new FlowQueryAgent();

    private messagesEndRef: RefObject<HTMLDivElement | null>;

    constructor(props: ChatContainerProps) {
        super(props);
        this.state = {
            messages: [],
            isLoading: false,
            error: null
        };
        this.messagesEndRef = createRef<HTMLDivElement>();
    }

    componentDidUpdate(_prevProps: ChatContainerProps, prevState: ChatContainerState): void {
        if (prevState.messages !== this.state.messages) {
            this.scrollToBottom();
        }
    }

    private scrollToBottom = (): void => {
        this.messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    private generateMessageId = (): string => {
        return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    };

    private buildConversationHistory = (currentMessages: Message[]): Array<{ role: 'user' | 'assistant'; content: string }> => {
        return currentMessages.map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
        }));
    };

    private handleSendMessage = async (content: string): Promise<void> => {
        const { systemPrompt, showIntermediateSteps } = this.props;
        const { messages } = this.state;

        const userMessage: Message = {
            id: this.generateMessageId(),
            role: 'user',
            content,
            timestamp: new Date()
        };

        this.setState(prev => ({
            messages: [...prev.messages, userMessage],
            isLoading: true,
            error: null
        }));

        const assistantMessageId = this.generateMessageId();
        // Track the current message ID - may change if newMessage flag is received during streaming
        // Needs to be in outer scope so catch block can access it
        let currentMessageId = assistantMessageId;
        
        try {
            const conversationHistory = this.buildConversationHistory([...messages, userMessage]);

            const assistantMessage: Message = {
                id: assistantMessageId,
                role: 'assistant',
                content: '',
                timestamp: new Date(),
                isStreaming: true
            };
            this.setState(prev => ({
                messages: [...prev.messages, assistantMessage]
            }));

            let fullContent = '';
            let thinkingEntries: ThinkingEntry[] = [];
            
            for await (const { chunk, done, newMessage, thinkingEntry } of this.agent.processQueryStream(content, {
                systemPrompt: systemPrompt ?? 'You are a helpful assistant. Be concise and informative in your responses.',
                conversationHistory: conversationHistory.slice(0, -1),
                showIntermediateSteps,
                maxRetries: getMaxRetries(),
            })) {
                // Accumulate thinking entries for the collapsible panel
                if (thinkingEntry) {
                    thinkingEntries = [...thinkingEntries, thinkingEntry];
                    this.setState(prev => ({
                        messages: prev.messages.map(msg => 
                            msg.id === currentMessageId 
                                ? { ...msg, thinkingEntries: thinkingEntries, isThinking: true }
                                : msg
                        )
                    }));
                }

                // If newMessage flag is set, finalize current message and start a new one
                if (newMessage) {
                    const previousMessageId = currentMessageId;
                    currentMessageId = this.generateMessageId();
                    fullContent = '';
                    thinkingEntries = [];
                    const newAssistantMessage: Message = {
                        id: currentMessageId,
                        role: 'assistant',
                        content: '',
                        timestamp: new Date(),
                        isStreaming: true
                    };
                    this.setState(prev => ({
                        messages: [...prev.messages.map(msg => 
                            msg.id === previousMessageId 
                                ? { ...msg, isStreaming: false, isThinking: false }
                                : msg
                        ), newAssistantMessage]
                    }));
                }
                
                if (chunk) {
                    fullContent += chunk;
                    this.setState(prev => ({
                        messages: prev.messages.map(msg => 
                            msg.id === currentMessageId 
                                ? { ...msg, content: fullContent }
                                : msg
                        )
                    }));
                }
                
                if (done) {
                    this.setState(prev => ({
                        messages: prev.messages.map(msg => 
                            msg.id === currentMessageId 
                                ? { ...msg, isStreaming: false, isThinking: false }
                                : msg
                        )
                    }));
                }
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An error occurred while processing your request.';
            
            // Add or update error message as assistant response
            // Use currentMessageId which may differ from assistantMessageId if a retry created a new message
            const errorContent = `⚠️ Error: ${errorMessage}`;
            this.setState(prev => {
                // Check if we already added a streaming message with this ID
                const existingMessageIndex = prev.messages.findIndex(msg => msg.id === currentMessageId);
                if (existingMessageIndex !== -1) {
                    // Update existing message
                    return {
                        messages: prev.messages.map(msg => 
                            msg.id === currentMessageId 
                                ? { ...msg, content: errorContent, isStreaming: false }
                                : msg
                        ),
                        error: errorMessage
                    };
                } else {
                    // Add new error message
                    return {
                        messages: [...prev.messages, {
                            id: currentMessageId,
                            role: 'assistant' as const,
                            content: errorContent,
                            timestamp: new Date()
                        }],
                        error: errorMessage
                    };
                }
            });
        } finally {
            this.setState({ isLoading: false });
        }
    };

    private handleClearChat = (): void => {
        this.setState({
            messages: [],
            error: null
        });
    };

    render(): React.ReactNode {
        const { messages, isLoading, error } = this.state;

        return (
            <div className="chat-container">
                <div className="chat-messages">
                    {messages.length === 0 ? (
                        <div className="chat-empty-state">
                            <p>Start a conversation by typing a message below.</p>
                        </div>
                    ) : (
                        messages.map(message => (
                            <ChatMessage key={message.id} message={message} />
                        ))
                    )}
                    {isLoading && messages[messages.length - 1]?.role === 'user' && (
                        <div className="chat-loading">
                            <Spinner size="small" label="Thinking..." />
                        </div>
                    )}
                    <div ref={this.messagesEndRef} />
                </div>
                
                {error && !messages.some(m => m.content.includes(error)) && (
                    <div className="chat-error">
                        {error}
                    </div>
                )}
                
                <ChatInput 
                    onSendMessage={this.handleSendMessage} 
                    isLoading={isLoading}
                    placeholder="Ask me anything..."
                />
                
                {messages.length > 0 && (
                    <button 
                        className="chat-clear-button"
                        onClick={this.handleClearChat}
                        disabled={isLoading}
                    >
                        Clear conversation
                    </button>
                )}
            </div>
        );
    }
}
