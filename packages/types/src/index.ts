// Base types
export type {
  Emotion,
  Role,
  ErrorType,
  VRMModel,
  Voice,
  Message,
  ChatMessage,
  AnimationTrigger,
  AnimationJudgment,
  AppError,
  ServiceError,
  VisemeName,
  VisemeData,
  AnimationLayerType,
  ScheduledAnimation,
  QueuedAnimation,
  AnimationJudgmentWithTiming,
  AnimationPlaybackOptions,
  AIStreamChunk,
  AIStreamOptions,
  AIStateChanges,
  TTSResult,
  AudioPlaybackOptions,
} from './base';

// Event bus
export { createEventBus } from './events';
export type {
  EventBus,
  EventHandler,
  STTEvents,
  TTSEvents,
  AvatarCoreEvents,
  ChatUIEvents,
  WidgetEvents,
  AllEvents,
} from './events';

// Agent message
export { createAgentMessage, getTextContent } from './agent-message';
export type {
  AgentMessage,
  MessagePart,
  TextPart,
  FilePart,
  DataPart,
  ToolCallPart,
  ToolResultPart,
} from './agent-message';

// Protocol adapter
export type {
  ProtocolAdapter,
  A2AMessage,
  MCPMessage,
  VercelAIMessage,
  LangChainMessage,
  MSAgentMessage,
  A2UIMessage,
} from './protocol-adapter';
