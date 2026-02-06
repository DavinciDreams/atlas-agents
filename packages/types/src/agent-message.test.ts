import { describe, it, expect } from 'vitest';
import { createAgentMessage, getTextContent } from './agent-message';
import type { AgentMessage } from './agent-message';

describe('AgentMessage', () => {
  it('should create a message with text content', () => {
    const msg = createAgentMessage('user', 'Hello world');

    expect(msg.role).toBe('user');
    expect(msg.parts).toHaveLength(1);
    expect(msg.parts[0]).toEqual({ type: 'text', text: 'Hello world' });
    expect(msg.timestamp).toBeGreaterThan(0);
    expect(msg.id).toBeTruthy();
  });

  it('should extract text content from message', () => {
    const msg: AgentMessage = {
      id: 'test',
      role: 'assistant',
      parts: [
        { type: 'text', text: 'Hello ' },
        { type: 'data', data: { key: 'value' } },
        { type: 'text', text: 'world' },
      ],
      timestamp: Date.now(),
    };

    expect(getTextContent(msg)).toBe('Hello world');
  });

  it('should include optional fields', () => {
    const msg = createAgentMessage('assistant', 'response', {
      agentId: 'agent-1',
      contextId: 'ctx-1',
    });

    expect(msg.agentId).toBe('agent-1');
    expect(msg.contextId).toBe('ctx-1');
  });

  it('should generate unique ids', () => {
    const msg1 = createAgentMessage('user', 'a');
    const msg2 = createAgentMessage('user', 'b');
    expect(msg1.id).not.toBe(msg2.id);
  });
});
