import React from 'react';
import type { Message } from '@atlas-agents/types';

export interface ChatMessageProps {
  message: Message;
  onCopy?: (text: string) => void;
  onDownload?: (text: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onCopy, onDownload }) => {
  const handleCopy = async () => {
    if (onCopy) { onCopy(message.content); return; }
    await navigator.clipboard.writeText(message.content);
  };

  const handleDownload = () => {
    if (onDownload) { onDownload(message.content); return; }
    const blob = new Blob([message.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-message-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ marginBottom: '1rem', textAlign: message.role === 'user' ? 'right' : 'left' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start' }}>
        {message.role === 'assistant' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <button onClick={handleCopy} title="Copy message" style={{ padding: '0.25rem', cursor: 'pointer', background: 'none', border: 'none', color: 'inherit' }}>
              📋
            </button>
            <button onClick={handleDownload} title="Download message" style={{ padding: '0.25rem', cursor: 'pointer', background: 'none', border: 'none', color: 'inherit' }}>
              💾
            </button>
          </div>
        )}
        <div style={{
          display: 'inline-block',
          padding: '0.5rem 1rem',
          borderRadius: '0.5rem',
          maxWidth: '80%',
          backgroundColor: message.role === 'user' ? '#14b8a6' : '#1f2937',
          color: 'white',
          borderTopRightRadius: message.role === 'user' ? 0 : undefined,
          borderTopLeftRadius: message.role === 'assistant' ? 0 : undefined,
        }}>
          {message.content}
        </div>
      </div>
    </div>
  );
};
