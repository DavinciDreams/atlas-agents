import type { ProtocolAdapter, AgentMessage, MCPMessage } from '@atlas.agents/types';
import { createAgentMessage, getTextContent } from '@atlas.agents/types';

/**
 * Anthropic MCP (Model Context Protocol) Adapter
 * Converts between AgentMessage and MCP JSON-RPC 2.0 format
 */
export class MCPAdapter implements ProtocolAdapter<MCPMessage, MCPMessage> {
  readonly protocol = 'mcp';

  fromProtocol(message: MCPMessage): AgentMessage {
    const params = message.params ?? message.result ?? {};
    const content = (params as Record<string, unknown>).content as string
      ?? (params as Record<string, unknown>).text as string
      ?? JSON.stringify(params);

    const role = message.method?.includes('tools') ? 'tool' : 'assistant';

    return createAgentMessage(role as AgentMessage['role'], content, {
      protocolMeta: { mcp: { jsonrpc: message.jsonrpc, method: message.method, id: message.id } }
    });
  }

  toProtocol(message: AgentMessage): MCPMessage {
    const text = getTextContent(message);
    return {
      jsonrpc: '2.0',
      result: {
        content: [{ type: 'text', text }],
        role: message.role,
      },
      id: message.id,
    };
  }

  fromHistory(messages: MCPMessage[]): AgentMessage[] {
    return messages.map(m => this.fromProtocol(m));
  }

  toHistory(messages: AgentMessage[]): MCPMessage[] {
    return messages.map(m => this.toProtocol(m));
  }
}
