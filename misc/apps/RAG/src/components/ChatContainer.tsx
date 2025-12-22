import React, { useState, useCallback, useRef, useEffect } from 'react';
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

export const ChatContainer: React.FC<ChatContainerProps> = ({
    systemPrompt = 'You are a helpful assistant. Be concise and informative in your responses.',
    llmOptions = {},
    useStreaming = true,
    useFlowQueryAgent = true,
    showIntermediateSteps = true
}) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    const generateMessageId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const buildConversationHistory = useCallback((currentMessages: Message[]) => {
        return currentMessages.map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
        }));
    }, []);

    const handleSendMessage = useCallback(async (content: string) => {
        const userMessage: Message = {
            id: generateMessageId(),
            role: 'user',
            content,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);
        setError(null);

        const assistantMessageId = generateMessageId();
        
        try {
            const conversationHistory = buildConversationHistory([...messages, userMessage]);
            
            if (useFlowQueryAgent) {
                // Use the FlowQuery agent for processing
                const assistantMessage: Message = {
                    id: assistantMessageId,
                    role: 'assistant',
                    content: '',
                    timestamp: new Date(),
                    isStreaming: true
                };
                setMessages(prev => [...prev, assistantMessage]);

                let fullContent = '';
                
                for await (const { chunk, done } of processQueryStream(content, {
                    systemPrompt,
                    llmOptions,
                    conversationHistory: conversationHistory.slice(0, -1),
                    showIntermediateSteps
                })) {
                    if (chunk) {
                        fullContent += chunk;
                        setMessages(prev => 
                            prev.map(msg => 
                                msg.id === assistantMessageId 
                                    ? { ...msg, content: fullContent }
                                    : msg
                            )
                        );
                    }
                    
                    if (done) {
                        setMessages(prev => 
                            prev.map(msg => 
                                msg.id === assistantMessageId 
                                    ? { ...msg, isStreaming: false }
                                    : msg
                            )
                        );
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
                    setMessages(prev => [...prev, assistantMessage]);

                    let fullContent = '';
                    for await (const chunk of llmStream(content, options)) {
                        const deltaContent = chunk.choices?.[0]?.delta?.content || '';
                        if (deltaContent) {
                            fullContent += deltaContent;
                            setMessages(prev => 
                                prev.map(msg => 
                                    msg.id === assistantMessageId 
                                        ? { ...msg, content: fullContent }
                                        : msg
                                )
                            );
                        }
                    }

                    setMessages(prev => 
                        prev.map(msg => 
                            msg.id === assistantMessageId 
                                ? { ...msg, isStreaming: false }
                                : msg
                        )
                    );
                } else {
                    const response = await llm(content, options);
                    const assistantContent = response.choices[0]?.message?.content || 'No response received.';
                    
                    const assistantMessage: Message = {
                        id: assistantMessageId,
                        role: 'assistant',
                        content: assistantContent,
                        timestamp: new Date()
                    };
                    setMessages(prev => [...prev, assistantMessage]);
                }
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An error occurred while processing your request.';
            setError(errorMessage);
            
            // Add or update error message as assistant response
            const errorContent = `⚠️ Error: ${errorMessage}`;
            setMessages(prev => {
                // Check if we already added a streaming message with this ID
                const existingMessageIndex = prev.findIndex(msg => msg.id === assistantMessageId);
                if (existingMessageIndex !== -1) {
                    // Update existing message
                    return prev.map(msg => 
                        msg.id === assistantMessageId 
                            ? { ...msg, content: errorContent, isStreaming: false }
                            : msg
                    );
                } else {
                    // Add new error message
                    return [...prev, {
                        id: assistantMessageId,
                        role: 'assistant' as const,
                        content: errorContent,
                        timestamp: new Date()
                    }];
                }
            });
        } finally {
            setIsLoading(false);
        }
    }, [messages, systemPrompt, llmOptions, useStreaming, useFlowQueryAgent, showIntermediateSteps, buildConversationHistory]);

    const handleClearChat = useCallback(() => {
        setMessages([]);
        setError(null);
    }, []);

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
                <div ref={messagesEndRef} />
            </div>
            
            {error && !messages.some(m => m.content.includes(error)) && (
                <div className="chat-error">
                    {error}
                </div>
            )}
            
            <ChatInput 
                onSendMessage={handleSendMessage} 
                isLoading={isLoading}
                placeholder="Ask me anything..."
            />
            
            {messages.length > 0 && (
                <button 
                    className="chat-clear-button"
                    onClick={handleClearChat}
                    disabled={isLoading}
                >
                    Clear conversation
                </button>
            )}
        </div>
    );
};
