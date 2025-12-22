import React, { useState, useCallback, KeyboardEvent } from 'react';
import { Textarea, Button } from '@fluentui/react-components';
import { SendFilled } from '@fluentui/react-icons';
import './ChatInput.css';

interface ChatInputProps {
    onSendMessage: (message: string) => void;
    isLoading: boolean;
    placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
    onSendMessage,
    isLoading,
    placeholder = 'Ask me anything...'
}) => {
    const [inputValue, setInputValue] = useState('');

    const handleSend = useCallback(() => {
        const trimmedValue = inputValue.trim();
        if (trimmedValue && !isLoading) {
            onSendMessage(trimmedValue);
            setInputValue('');
        }
    }, [inputValue, isLoading, onSendMessage]);

    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }, [handleSend]);

    const handleChange = useCallback((
        _e: React.ChangeEvent<HTMLTextAreaElement>,
        data: { value: string }
    ) => {
        setInputValue(data.value);
    }, []);

    return (
        <div className="chat-input-container">
            <Textarea
                className="chat-input-textarea"
                value={inputValue}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                resize="none"
                disabled={isLoading}
            />
            <Button
                className="chat-input-send-button"
                appearance="primary"
                icon={<SendFilled />}
                onClick={handleSend}
                disabled={isLoading || !inputValue.trim()}
                title="Send message (Enter)"
            />
        </div>
    );
};
