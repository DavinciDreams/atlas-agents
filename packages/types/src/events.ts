import type { AnimationTrigger, AnimationJudgment, Emotion, VisemeData, VisemeName } from './base';

// ============================================================================
// Event Bus
// ============================================================================

export type EventHandler<T = unknown> = (data: T) => void;

export interface EventBus<TEvents extends Record<string, any>> {
  emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void;
  on<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): () => void;
  off<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): void;
  once<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): () => void;
  removeAllListeners(): void;
}

export function createEventBus<TEvents extends Record<string, any>>(): EventBus<TEvents> {
  const listeners = new Map<keyof TEvents, Set<EventHandler<unknown>>>();

  return {
    emit<K extends keyof TEvents>(event: K, data: TEvents[K]) {
      const handlers = listeners.get(event);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(data);
          } catch (err) {
            console.error(`[EventBus] Error in handler for "${String(event)}":`, err);
          }
        });
      }
    },

    on<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(handler as EventHandler<unknown>);
      return () => this.off(event, handler);
    },

    off<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>) {
      const handlers = listeners.get(event);
      if (handlers) {
        handlers.delete(handler as EventHandler<unknown>);
        if (handlers.size === 0) {
          listeners.delete(event);
        }
      }
    },

    once<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>) {
      const wrappedHandler: EventHandler<TEvents[K]> = (data) => {
        this.off(event, wrappedHandler);
        handler(data);
      };
      return this.on(event, wrappedHandler);
    },

    removeAllListeners() {
      listeners.clear();
    }
  };
}

// ============================================================================
// Per-Package Event Definitions
// ============================================================================

export interface STTEvents {
  'stt:started': {};
  'stt:stopped': {};
  'stt:interim-transcript': { text: string; confidence: number };
  'stt:final-transcript': { text: string; confidence: number };
  'stt:error': { error: Error; type: string };
}

export interface TTSEvents {
  'tts:speaking-started': { text: string };
  'tts:speaking-ended': { text: string };
  'tts:synthesis-complete': { audioBuffer: ArrayBuffer; visemes: VisemeData[]; duration: number };
  'tts:chunk-spoken': { text: string };
  'tts:stopped': {};
  'tts:error': { error: Error };
}

export interface AvatarCoreEvents {
  'avatar:model-loaded': { modelUrl: string };
  'avatar:model-error': { error: Error };
  'avatar:animation-started': { name: string };
  'avatar:animation-ended': { name: string };
  'avatar:animation-queue-complete': {};
  'avatar:viseme-applied': { viseme: VisemeName; weight: number };
  'avatar:disposed': {};
}

export interface ChatUIEvents {
  'chat:message-sent': { text: string };
  'chat:mic-toggled': { isListening: boolean };
  'chat:stop-speaking': {};
  'chat:mute-toggled': { isMuted: boolean };
  'chat:new-chat': {};
}

export interface WidgetEvents {
  'widget:ai-response-start': { userMessage: string };
  'widget:ai-response-chunk': { content: string; isComplete: boolean };
  'widget:ai-response-complete': { fullText: string };
  'widget:ai-response-error': { error: Error };
  'widget:animation-judgment': { judgment: AnimationJudgment };
  'widget:state-change': { key: string; value: unknown };
}

/** Combined event map for the full widget */
export type AllEvents = STTEvents & TTSEvents & AvatarCoreEvents & ChatUIEvents & WidgetEvents;
