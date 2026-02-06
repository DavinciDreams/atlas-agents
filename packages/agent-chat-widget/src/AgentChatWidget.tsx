import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Message } from '@atlas.agents/types';
import { ChatContainer } from '@atlas.agents/chat-ui';
import { STTService, type STTConfig } from '@atlas.agents/speech-stt';
import { TTSService, type TTSConfig } from '@atlas.agents/speech-tts';
import { LocalTTSService, checkLocalSpeechServer, type LocalTTSConfig } from '@atlas.agents/speech-tts-local';
import { LocalSTTService, type LocalSTTConfig } from '@atlas.agents/speech-stt-local';
import { ChatOrchestrator } from './ChatOrchestrator';
import { AnimationJudge, type AnimationJudgeConfig } from './AnimationJudge';
import type { AIConfig } from './AIService';

/** Shared shape of any TTS service (TTSService | LocalTTSService) */
interface TTSProvider {
  synthesize(text: string): Promise<{ audioBuffer: ArrayBuffer; visemes: unknown[]; duration: number }>;
  speak(text: string): Promise<void>;
  speakChunk(text: string): void;
  stop(): void;
  isSpeaking(): boolean;
  on(event: string, handler: (data: unknown) => void): () => void;
  dispose(): void;
}

/** Shared shape of any STT service (STTService | LocalSTTService) */
interface STTProvider {
  start(): Promise<void>;
  stop(): void;
  isListening(): boolean;
  on(event: string, handler: (data: unknown) => void): () => void;
  dispose(): void;
}

export interface AgentChatWidgetConfig {
  agentId?: string;
  avatar?: {
    modelUrl?: string;
    defaultAnimation?: string;
    animationBasePath?: string;
  };
  ai?: AIConfig;
  speech?: {
    tts?: TTSConfig;
    stt?: STTConfig;
    localTts?: LocalTTSConfig;
    localStt?: LocalSTTConfig;
    /** Set to false to disable auto-detection of local speech server. Default: true */
    autoDetectLocal?: boolean;
  };
  judge?: AnimationJudgeConfig;
  protocols?: {
    a2a?: Record<string, unknown>;
    mcp?: Record<string, unknown>;
  };
  theme?: 'dark' | 'light';
  maxMessages?: number;
}

export interface AgentChatWidgetProps {
  config: AgentChatWidgetConfig;
  onMessage?: (message: Message) => void;
  onAnimationTrigger?: (animations: Array<{ name: string; delay?: number }>) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const AgentChatWidget: React.FC<AgentChatWidgetProps> = ({
  config,
  onMessage,
  onAnimationTrigger,
  className,
  style,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentAnimation, setCurrentAnimation] = useState<string | null>(
    config.avatar?.defaultAnimation ?? 'modelPose'
  );

  const orchestratorRef = useRef<ChatOrchestrator | null>(null);
  const sttRef = useRef<STTProvider | null>(null);
  const ttsRef = useRef<TTSProvider | null>(null);
  const judgeRef = useRef<AnimationJudge | null>(null);
  const queueTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const handleSendMessageRef = useRef<(text: string) => void>(() => {});

  const handleSendMessage = useCallback(async (text: string) => {
    if (!orchestratorRef.current || isProcessing) return;

    setIsProcessing(true);
    setIsSpeaking(true);

    try {
      const fullText = await orchestratorRef.current.handleUserMessageStreaming(
        text,
        (chunk) => {
          // Stream TTS chunks
          if (!isMuted && ttsRef.current) {
            ttsRef.current.speakChunk(chunk);
          }
          // Update messages
          setMessages(orchestratorRef.current!.getMessages());
        }
      );

      // Update messages with final state
      setMessages(orchestratorRef.current.getMessages());

      // Animation judgment
      if (judgeRef.current && fullText) {
        const judgment = await judgeRef.current.judge(text, fullText);
        if (judgment.animations.length > 0) {
          onAnimationTrigger?.(judgment.animations);
          processAnimationQueue(judgment.animations);
        }
      }

      onMessage?.(orchestratorRef.current.getMessages().slice(-1)[0]);
    } catch (error) {
      console.error('Error processing message:', error);
    } finally {
      setIsProcessing(false);
      setIsSpeaking(false);
    }
  }, [isProcessing, isMuted, onMessage, onAnimationTrigger]);

  // Keep ref in sync so the STT event listener always calls the latest version
  handleSendMessageRef.current = handleSendMessage;

  // Initialize services
  useEffect(() => {
    let disposed = false;

    orchestratorRef.current = new ChatOrchestrator(config.ai ?? {}, config.maxMessages);
    judgeRef.current = new AnimationJudge({
      apiKey: config.ai?.apiKey,
      ...config.judge,
    });

    const wireSTT = (stt: STTProvider) => {
      stt.on('stt:final-transcript', (data: unknown) => {
        const { text } = data as { text: string };
        handleSendMessageRef.current(text);
      });
      stt.on('stt:started', () => setIsListening(true));
      stt.on('stt:stopped', () => setIsListening(false));
      stt.on('stt:error', (data: unknown) => {
        const { error, type } = data as { error: Error; type: string };
        console.error(`[STT Error] ${type}:`, error.message);
        setIsListening(false);
      });
    };

    const initServices = async () => {
      const autoDetect = config.speech?.autoDetectLocal !== false;

      if (autoDetect) {
        const { available } = await checkLocalSpeechServer();
        if (!disposed && available) {
          console.info('[Speech] Local speech server detected — using Kokoro TTS + Faster-Whisper STT');
          ttsRef.current = new LocalTTSService(config.speech?.localTts) as unknown as TTSProvider;
          sttRef.current = new LocalSTTService(config.speech?.localStt) as unknown as STTProvider;
          wireSTT(sttRef.current);
          return;
        }
      }

      if (disposed) return;

      // Fallback to web speech services
      ttsRef.current = new TTSService(config.speech?.tts) as unknown as TTSProvider;
      sttRef.current = new STTService(config.speech?.stt) as unknown as STTProvider;
      wireSTT(sttRef.current);
    };

    initServices();

    return () => {
      disposed = true;
      orchestratorRef.current?.dispose();
      sttRef.current?.dispose();
      ttsRef.current?.dispose();
      queueTimeoutsRef.current.forEach(t => clearTimeout(t));
    };
  }, []);

  const processAnimationQueue = useCallback((animations: Array<{ name: string; delay?: number }>) => {
    // Clear previous queue
    queueTimeoutsRef.current.forEach(t => clearTimeout(t));
    queueTimeoutsRef.current = [];

    let cumulativeDelay = 0;
    const DEFAULT_DURATION = 3000;

    animations.forEach((anim) => {
      const timeout = setTimeout(() => {
        setCurrentAnimation(anim.name);
      }, cumulativeDelay);
      queueTimeoutsRef.current.push(timeout);
      cumulativeDelay += DEFAULT_DURATION;
    });

    // Reset to idle after all animations
    const resetTimeout = setTimeout(() => {
      setCurrentAnimation(config.avatar?.defaultAnimation ?? 'modelPose');
    }, cumulativeDelay);
    queueTimeoutsRef.current.push(resetTimeout);
  }, [config.avatar?.defaultAnimation]);

  const handleMicToggle = useCallback(() => {
    if (!sttRef.current) return;
    if (isListening) {
      sttRef.current.stop();
    } else {
      sttRef.current.start().catch((err) => {
        console.error('[STT] Failed to start:', err);
        setIsListening(false);
      });
    }
  }, [isListening]);

  const handleStopSpeaking = useCallback(() => {
    ttsRef.current?.stop();
    queueTimeoutsRef.current.forEach(t => clearTimeout(t));
    queueTimeoutsRef.current = [];
    setCurrentAnimation(config.avatar?.defaultAnimation ?? 'modelPose');
    setIsSpeaking(false);
  }, [config.avatar?.defaultAnimation]);

  const handleMuteToggle = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (newMuted) {
      ttsRef.current?.stop();
    }
  }, [isMuted]);

  const handleNewChat = useCallback(() => {
    orchestratorRef.current?.clearMessages();
    setMessages([]);
    handleStopSpeaking();
  }, [handleStopSpeaking]);

  return (
    <ChatContainer
      messages={messages}
      isProcessing={isProcessing}
      isSpeaking={isSpeaking}
      isListening={isListening}
      isMuted={isMuted}
      currentAnimation={currentAnimation}
      onSendMessage={handleSendMessage}
      onMicToggle={handleMicToggle}
      onStopSpeaking={handleStopSpeaking}
      onMuteToggle={handleMuteToggle}
      onNewChat={handleNewChat}
      theme={config.theme}
      className={className}
      style={style}
    />
  );
};
