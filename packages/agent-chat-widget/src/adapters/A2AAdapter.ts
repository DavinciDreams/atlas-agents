import type { ProtocolAdapter, AgentMessage, A2AMessage } from '@atlas.agents/types';
import { createAgentMessage, getTextContent } from '@atlas.agents/types';

/**
 * Google A2A (Agent-to-Agent) Protocol Adapter
 * Converts between AgentMessage and JSON-RPC 2.0 A2A format
 */
export class A2AAdapter implements ProtocolAdapter<A2AMessage, A2AMessage> {
  readonly protocol = 'a2a';

  fromProtocol(message: A2AMessage): AgentMessage {
    // A2A uses tasks/messages/artifacts pattern
    const params = message.params ?? message.result ?? {};
    const text = (params as Record<string, unknown>).text as string ?? JSON.stringify(params);
    const role = message.method?.includes('send') ? 'user' : 'assistant';

    return createAgentMessage(role as AgentMessage['role'], text, {
      protocolMeta: { a2a: { jsonrpc: message.jsonrpc, method: message.method, id: message.id } }
    });
  }

  toProtocol(message: AgentMessage): A2AMessage {
    const text = getTextContent(message);
    return {
      jsonrpc: '2.0',
      method: message.role === 'user' ? 'message/send' : 'message/response',
      params: {
        message: {
          role: message.role,
          parts: [{ type: 'text', text }]
        }
      },
      id: message.id,
    };
  }

  fromHistory(messages: A2AMessage[]): AgentMessage[] {
    return messages.map(m => this.fromProtocol(m));
  }

  toHistory(messages: AgentMessage[]): A2AMessage[] {
    return messages.map(m => this.toProtocol(m));
  }
}
