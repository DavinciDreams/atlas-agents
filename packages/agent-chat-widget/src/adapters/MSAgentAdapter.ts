import type { ProtocolAdapter, AgentMessage, MSAgentMessage } from '@atlas.agents/types';
import { createAgentMessage, getTextContent } from '@atlas.agents/types';

/**
 * Microsoft Agent Framework Adapter
 * Converts between AgentMessage and MS Agent ChatMessageContent format
 */
export class MSAgentAdapter implements ProtocolAdapter<MSAgentMessage, MSAgentMessage> {
  readonly protocol = 'ms-agent';

  fromProtocol(message: MSAgentMessage): AgentMessage {
    return createAgentMessage(message.role as AgentMessage['role'], message.content, {
      protocolMeta: { msagent: { name: message.name, metadata: message.metadata } }
    });
  }

  toProtocol(message: AgentMessage): MSAgentMessage {
    const text = getTextContent(message);
    return {
      role: message.role,
      content: text,
      name: message.agentId,
      metadata: message.protocolMeta?.msagent as Record<string, unknown>,
    };
  }

  fromHistory(messages: MSAgentMessage[]): AgentMessage[] {
    return messages.map(m => this.fromProtocol(m));
  }

  toHistory(messages: AgentMessage[]): MSAgentMessage[] {
    return messages.map(m => this.toProtocol(m));
  }
}
