// ============================================================================
// Universal Agent Message Format
// ============================================================================

export interface TextPart {
  type: 'text';
  text: string;
}

export interface FilePart {
  type: 'file';
  mimeType: string;
  data: string; // base64 or URL
  name?: string;
}

export interface DataPart {
  type: 'data';
  data: Record<string, unknown>;
}

export interface ToolCallPart {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
}

export interface ToolResultPart {
  type: 'tool-result';
  toolCallId: string;
  result: unknown;
  isError?: boolean;
}

export type MessagePart = TextPart | FilePart | DataPart | ToolCallPart | ToolResultPart;

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  parts: MessagePart[];
  timestamp: number;
  agentId?: string;
  contextId?: string;
  protocolMeta?: {
    a2a?: Record<string, unknown>;
    mcp?: Record<string, unknown>;
    vercelai?: Record<string, unknown>;
    langchain?: Record<string, unknown>;
    msagent?: Record<string, unknown>;
    a2ui?: Record<string, unknown>;
  };
}

// ============================================================================
// Helper functions
// ============================================================================

let _idCounter = 0;
function generateId(): string {
  return `msg_${Date.now()}_${++_idCounter}`;
}

export function createAgentMessage(
  role: AgentMessage['role'],
  text: string,
  options?: Partial<Pick<AgentMessage, 'agentId' | 'contextId' | 'protocolMeta'>>
): AgentMessage {
  return {
    id: generateId(),
    role,
    parts: [{ type: 'text', text }],
    timestamp: Date.now(),
    ...options,
  };
}

export function getTextContent(message: AgentMessage): string {
  return message.parts
    .filter((p): p is TextPart => p.type === 'text')
    .map(p => p.text)
    .join('');
}
