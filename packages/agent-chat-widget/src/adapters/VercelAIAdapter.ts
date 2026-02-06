import type { ProtocolAdapter, AgentMessage, VercelAIMessage } from '@atlas-agents/types';
import { createAgentMessage, getTextContent } from '@atlas-agents/types';

/**
 * Vercel AI SDK Adapter
 * Converts between AgentMessage and Vercel AI SDK UIMessage format
 */
export class VercelAIAdapter implements ProtocolAdapter<VercelAIMessage, VercelAIMessage> {
  readonly protocol = 'vercel-ai';

  fromProtocol(message: VercelAIMessage): AgentMessage {
    const role = message.role === 'data' ? 'system' : message.role;
    return createAgentMessage(role as AgentMessage['role'], message.content, {
      protocolMeta: { vercelai: { id: message.id, createdAt: message.createdAt?.toISOString(), parts: message.parts } }
    });
  }

  toProtocol(message: AgentMessage): VercelAIMessage {
    const text = getTextContent(message);
    return {
      id: message.id,
      role: message.role === 'tool' ? 'data' : message.role as VercelAIMessage['role'],
      content: text,
      createdAt: new Date(message.timestamp),
    };
  }

  fromHistory(messages: VercelAIMessage[]): AgentMessage[] {
    return messages.map(m => this.fromProtocol(m));
  }

  toHistory(messages: AgentMessage[]): VercelAIMessage[] {
    return messages.map(m => this.toProtocol(m));
  }
}
