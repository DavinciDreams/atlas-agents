// ============================================================================
// Base Types (extracted from 3dchat/src/types/index.ts)
// ============================================================================

export type Emotion = 'neutral' | 'happy' | 'thinking' | 'sad';
export type Role = 'user' | 'assistant' | 'system' | 'tool';
export type ErrorType = 'network' | 'validation' | 'auth' | 'unknown';

export interface VRMModel {
  id: string;
  name: string;
  path: string;
  rotationY?: number;
  positionY?: number;
  scale?: number;
}

export interface Voice {
  id: string;
  name: string;
  displayName: string;
  gender: 'male' | 'female';
  language: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AnimationTrigger {
  name: string;
  delay?: number;
}

export interface AnimationJudgment {
  animations: AnimationTrigger[];
  reasoning: string;
}

export interface AppError {
  type: ErrorType;
  message: string;
  code?: number;
  original?: unknown;
  timestamp?: number;
}

export interface ServiceError extends AppError {
  service: 'ai' | 'speech' | 'animation';
  statusCode?: number;
  retry?: boolean;
}

// ============================================================================
// Viseme Types
// ============================================================================

export type VisemeName =
  | 'sil' | 'PP' | 'FF' | 'TH' | 'DD'
  | 'kk' | 'CH' | 'SS' | 'nn' | 'RR'
  | 'aa' | 'E' | 'ih' | 'oh' | 'ou';

export interface VisemeData {
  name: VisemeName;
  weight: number;
  duration?: number;
}

// ============================================================================
// Animation Types
// ============================================================================

export type AnimationLayerType =
  | 'full_body'
  | 'upper_body'
  | 'lower_body'
  | 'gesture'
  | 'idle';

export interface ScheduledAnimation {
  name: string;
  triggerTime: number;
  duration: number;
  layer?: AnimationLayerType;
  interruptible?: boolean;
}

export interface QueuedAnimation {
  id: string;
  name: string;
  layer: AnimationLayerType;
  startTime: number;
  duration: number;
  blendIn: number;
  blendOut: number;
  interruptible: boolean;
  fadeIn?: number;
  fadeOut?: number;
}

export interface AnimationJudgmentWithTiming extends AnimationJudgment {
  suggestedTiming?: 'early' | 'middle' | 'late' | 'distributed';
  suggestedLayer?: AnimationLayerType;
  interruptible?: boolean;
}

export interface AnimationPlaybackOptions {
  fadeIn?: number;
  fadeOut?: number;
  loop?: boolean;
  speed?: number;
  layer?: AnimationLayerType;
}

// ============================================================================
// AI Service Types
// ============================================================================

export interface AIStreamChunk {
  content: string;
  isComplete: boolean;
}

export interface AIStreamOptions {
  onChunk: (chunk: AIStreamChunk) => void;
  onError?: (error: Error) => void;
}

export interface AIStateChanges {
  isProcessing?: boolean;
  emotion?: Emotion;
}

// ============================================================================
// TTS / Audio Types
// ============================================================================

export interface TTSResult {
  audioBuffer: ArrayBuffer;
  visemes: VisemeData[];
  duration: number;
}

export interface AudioPlaybackOptions {
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onInterrupted?: () => void;
  onError?: (error: Error) => void;
}
