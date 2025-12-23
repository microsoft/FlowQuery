import React, { Component, createRef, RefObject } from 'react';
import { Spinner } from '@fluentui/react-components';
import { ChatMessage, Message } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { LlmOptions } from '../plugins/loaders/Llm';
import { processQueryStream } from './FlowQueryAgent';
import './ChatContainer.css';

interface ChatContainerProps {
    systemPrompt?: string;
    llmOptions?: LlmOptions;
    useStreaming?: boolean;
    /** Whether to use the FlowQuery agent for processing queries */
    useFlowQueryAgent?: boolean;
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
        llmOptions: {},
        useStreaming: true,
        useFlowQueryAgent: true,
        showIntermediateSteps: true
    };

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
        const { systemPrompt, llmOptions, useStreaming, useFlowQueryAgent, showIntermediateSteps } = this.props;
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
        
        try {
            const conversationHistory = this.buildConversationHistory([...messages, userMessage]);
            
            if (useFlowQueryAgent) {
                // Use the FlowQuery agent for processing
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
                let adaptiveCardFromStream: Record<string, unknown> | undefined;
                let currentMessageId = assistantMessageId;
                
                for await (const { chunk, done, adaptiveCard, newMessage } of processQueryStream(content, {
                    systemPrompt: systemPrompt ?? 'You are a helpful assistant. Be concise and informative in your responses.',
                    llmOptions,
                    conversationHistory: conversationHistory.slice(0, -1),
                    showIntermediateSteps
                })) {
                    // If newMessage flag is set, finalize current message and start a new one
                    if (newMessage) {
                        // Mark current message as done streaming
                        this.setState(prev => ({
                            messages: prev.messages.map(msg => 
                                msg.id === currentMessageId 
                                    ? { ...msg, isStreaming: false }
                                    : msg
                            )
                        }));
                        
                        // Create a new assistant message for the retry
                        currentMessageId = this.generateMessageId();
                        fullContent = '';
                        const newAssistantMessage: Message = {
                            id: currentMessageId,
                            role: 'assistant',
                            content: '',
                            timestamp: new Date(),
                            isStreaming: true
                        };
                        this.setState(prev => ({
                            messages: [...prev.messages, newAssistantMessage]
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
                    
                    // Capture adaptive card if present
                    if (adaptiveCard) {
                        adaptiveCardFromStream = adaptiveCard;
                    }
                    
                    if (done) {
                        this.setState(prev => ({
                            messages: prev.messages.map(msg => 
                                msg.id === currentMessageId 
                                    ? { ...msg, isStreaming: false, adaptiveCard: adaptiveCardFromStream }
                                    : msg
                            )
                        }));
                    }
                }
            } else {
                // Original LLM-only behavior (kept for backward compatibility)
                const { llm, llmStream } = await import('../plugins/loaders/Llm');
                
                const options: LlmOptions = {
                    ...llmOptions,
                    systemPrompt,
                    messages: conversationHistory.slice(0, -1),
                };

                if (useStreaming) {
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
                    for await (const chunk of llmStream(content, options)) {
                        const deltaContent = chunk.choices?.[0]?.delta?.content || '';
                        if (deltaContent) {
                            fullContent += deltaContent;
                            this.setState(prev => ({
                                messages: prev.messages.map(msg => 
                                    msg.id === assistantMessageId 
                                        ? { ...msg, content: fullContent }
                                        : msg
                                )
                            }));
                        }
                    }

                    this.setState(prev => ({
                        messages: prev.messages.map(msg => 
                            msg.id === assistantMessageId 
                                ? { ...msg, isStreaming: false }
                                : msg
                        )
                    }));
                } else {
                    const response = await llm(content, options);
                    const assistantContent = response.choices[0]?.message?.content || 'No response received.';
                    
                    const assistantMessage: Message = {
                        id: assistantMessageId,
                        role: 'assistant',
                        content: assistantContent,
                        timestamp: new Date()
                    };
                    this.setState(prev => ({
                        messages: [...prev.messages, assistantMessage]
                    }));
                }
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An error occurred while processing your request.';
            
            // Add or update error message as assistant response
            const errorContent = `⚠️ Error: ${errorMessage}`;
            this.setState(prev => {
                // Check if we already added a streaming message with this ID
                const existingMessageIndex = prev.messages.findIndex(msg => msg.id === assistantMessageId);
                if (existingMessageIndex !== -1) {
                    // Update existing message
                    return {
                        messages: prev.messages.map(msg => 
                            msg.id === assistantMessageId 
                                ? { ...msg, content: errorContent, isStreaming: false }
                                : msg
                        ),
                        error: errorMessage
                    };
                } else {
                    // Add new error message
                    return {
                        messages: [...prev.messages, {
                            id: assistantMessageId,
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
