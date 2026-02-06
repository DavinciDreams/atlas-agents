import React, { useState, useRef, useEffect } from 'react';
import type { Message } from '@atlas-agents/types';
import { ChatMessage } from './ChatMessage';
import { AnimationIndicator } from './AnimationIndicator';

export interface ChatContainerProps {
  messages: Message[];
  isProcessing?: boolean;
  isSpeaking?: boolean;
  isListening?: boolean;
  isMuted?: boolean;
  currentAnimation?: string | null;
  onSendMessage: (text: string) => void;
  onMicToggle?: () => void;
  onStopSpeaking?: () => void;
  onMuteToggle?: () => void;
  onNewChat?: () => void;
  theme?: 'dark' | 'light';
  placeholder?: string;
  emptyMessage?: string;
  style?: React.CSSProperties;
  className?: string;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  isProcessing = false,
  isSpeaking = false,
  isListening = false,
  isMuted = false,
  currentAnimation = null,
  onSendMessage,
  onMicToggle,
  onStopSpeaking,
  onMuteToggle,
  onNewChat,
  theme = 'dark',
  placeholder = 'Type a message...',
  emptyMessage = 'Ask me anything!',
  style,
  className,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#111827' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#111827';
  const borderColor = isDark ? '#374151' : '#e5e7eb';
  const inputBg = isDark ? '#1f2937' : '#f9fafb';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isProcessing) return;
    onSendMessage(trimmed);
    setInput('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: bgColor, color: textColor, border: `1px solid ${borderColor}`, borderRadius: '0.75rem', overflow: 'hidden', ...style }} className={className}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', borderBottom: `1px solid ${borderColor}`, backgroundColor: isDark ? 'rgba(31,41,55,0.5)' : 'rgba(249,250,251,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {onNewChat && (
            <button onClick={onNewChat} style={{ padding: '0.25rem 0.5rem', cursor: 'pointer', background: 'none', border: 'none', color: textColor, fontSize: '0.875rem' }}>
              + New
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {onMuteToggle && (
            <button onClick={onMuteToggle} style={{ padding: '0.375rem', cursor: 'pointer', background: 'none', border: 'none', color: textColor }} title={isMuted ? 'Unmute' : 'Mute'}>
              {isMuted ? '🔇' : '🔊'}
            </button>
          )}
          {isSpeaking && onStopSpeaking && (
            <button onClick={onStopSpeaking} style={{ padding: '0.25rem 0.5rem', cursor: 'pointer', background: 'none', border: 'none', color: '#ef4444', fontSize: '0.875rem' }}>
              ⏹ Stop
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem' }}>
        {messages.length === 0 ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', opacity: 0.5, fontSize: '0.875rem' }}>
            {emptyMessage}
          </div>
        ) : (
          messages.map(message => <ChatMessage key={message.id} message={message} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Animation Indicator */}
      <AnimationIndicator currentAnimation={currentAnimation} isSpeaking={isSpeaking} />

      {/* Input */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', borderTop: `1px solid ${borderColor}`, backgroundColor: isDark ? 'rgba(31,41,55,0.5)' : 'rgba(249,250,251,0.5)' }}>
        {onMicToggle && (
          <button type="button" onClick={onMicToggle} disabled={isProcessing} style={{
            padding: '0.5rem', borderRadius: '50%', cursor: isProcessing ? 'not-allowed' : 'pointer',
            backgroundColor: isListening ? '#ef4444' : (isDark ? '#374151' : '#e5e7eb'),
            color: 'white', border: 'none', opacity: isProcessing ? 0.5 : 1,
          }}>
            {isListening ? '🎤' : '🎙️'}
          </button>
        )}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={isProcessing || isListening}
          placeholder={isListening ? 'Listening...' : placeholder}
          style={{
            flex: 1, padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
            backgroundColor: inputBg, border: `1px solid ${borderColor}`,
            color: textColor, fontSize: '0.875rem', outline: 'none',
            opacity: (isProcessing || isListening) ? 0.5 : 1,
          }}
        />
        <button type="submit" disabled={!input.trim() || isProcessing} style={{
          padding: '0.5rem', borderRadius: '50%', cursor: (!input.trim() || isProcessing) ? 'not-allowed' : 'pointer',
          backgroundColor: '#14b8a6', color: 'white', border: 'none',
          opacity: (!input.trim() || isProcessing) ? 0.5 : 1,
        }}>
          {isProcessing ? '⏳' : '➤'}
        </button>
      </form>

      {/* Status */}
      {(isProcessing || isSpeaking) && (
        <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '1rem' }}>
          {isProcessing ? 'Thinking...' : 'Speaking...'}
        </div>
      )}
    </div>
  );
};
