import type { AgentMessage } from './agent-message';

// ============================================================================
// Protocol Adapter Interface
// ============================================================================

export interface ProtocolAdapter<TInbound = unknown, TOutbound = unknown> {
  readonly protocol: string;
  fromProtocol(message: TInbound): AgentMessage;
  toProtocol(message: AgentMessage): TOutbound;
  fromHistory(messages: TInbound[]): AgentMessage[];
  toHistory(messages: AgentMessage[]): TOutbound[];
}

// ============================================================================
// Protocol-specific message stubs
// (Full implementations in agent-chat-widget/adapters/)
// ============================================================================

/** Google A2A JSON-RPC 2.0 */
export interface A2AMessage {
  jsonrpc: '2.0';
  method?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  id?: string | number;
}

/** Anthropic MCP */
export interface MCPMessage {
  jsonrpc: '2.0';
  method?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  id?: string | number;
}

/** Vercel AI SDK UIMessage */
export interface VercelAIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'data';
  content: string;
  createdAt?: Date;
  parts?: Array<{ type: string; [key: string]: unknown }>;
}

/** LangChain message */
export interface LangChainMessage {
  type: 'human' | 'ai' | 'system' | 'tool';
  content: string;
  additional_kwargs?: Record<string, unknown>;
}

/** Microsoft Agent Framework */
export interface MSAgentMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

/** A2UI Surface model */
export interface A2UIMessage {
  type: 'createSurface' | 'updateComponents' | 'removeSurface';
  surfaceId: string;
  components?: Array<{ type: string; props: Record<string, unknown> }>;
}
