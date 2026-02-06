import type { ProtocolAdapter, AgentMessage, LangChainMessage } from '@atlas.agents/types';
import { createAgentMessage, getTextContent } from '@atlas.agents/types';

const ROLE_MAP: Record<string, AgentMessage['role']> = {
  human: 'user',
  ai: 'assistant',
  system: 'system',
  tool: 'tool',
};

const REVERSE_ROLE_MAP: Record<string, LangChainMessage['type']> = {
  user: 'human',
  assistant: 'ai',
  system: 'system',
  tool: 'tool',
};

/**
 * LangChain/LangGraph Adapter
 * Converts between AgentMessage and LangChain HumanMessage/AIMessage format
 */
export class LangChainAdapter implements ProtocolAdapter<LangChainMessage, LangChainMessage> {
  readonly protocol = 'langchain';

  fromProtocol(message: LangChainMessage): AgentMessage {
    const role = ROLE_MAP[message.type] ?? 'user';
    return createAgentMessage(role, message.content, {
      protocolMeta: { langchain: { type: message.type, additional_kwargs: message.additional_kwargs } }
    });
  }

  toProtocol(message: AgentMessage): LangChainMessage {
    const text = getTextContent(message);
    return {
      type: REVERSE_ROLE_MAP[message.role] ?? 'human',
      content: text,
    };
  }

  fromHistory(messages: LangChainMessage[]): AgentMessage[] {
    return messages.map(m => this.fromProtocol(m));
  }

  toHistory(messages: AgentMessage[]): LangChainMessage[] {
    return messages.map(m => this.toProtocol(m));
  }
}
