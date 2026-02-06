import { createEventBus, type EventBus, type TTSEvents, type VisemeData } from '@atlas.agents/types';
import { textToVisemes } from './visemePreprocessor';
import { TTSCache } from './TTSCache';

export interface TTSConfig {
  provider?: 'edge-tts' | 'web-speech';
  voice?: string;
  rate?: string;
  pitch?: string;
  volume?: string;
  cacheSize?: number;
  cacheTtlMs?: number;
}

export interface TTSResult {
  audioBuffer: ArrayBuffer;
  visemes: VisemeData[];
  duration: number;
}

export class TTSService {
  private config: Required<Pick<TTSConfig, 'provider' | 'voice' | 'rate' | 'pitch' | 'volume'>>;
  private eventBus: EventBus<TTSEvents>;
  private cache: TTSCache;
  private _isSpeaking = false;
  private audioContext: AudioContext | null = null;
  private currentAudioSource: AudioBufferSourceNode | null = null;
  // Web Speech streaming state
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private speechChunkBuffer = '';
  private speechBufferTimeout: number | null = null;
  private speechSegmentQueue: string[] = [];
  private isSpeakingQueue = false;
  private readonly SPEAK_BUFFER_DELAY = 150;

  constructor(config: TTSConfig = {}) {
    this.config = {
      provider: config.provider ?? 'edge-tts',
      voice: config.voice ?? 'en-GB-LibbyNeural',
      rate: config.rate ?? '+0%',
      pitch: config.pitch ?? '+0Hz',
      volume: config.volume ?? '+0%',
    };
    this.eventBus = createEventBus<TTSEvents>();
    this.cache = new TTSCache(config.cacheSize, config.cacheTtlMs);
  }

  async synthesize(text: string): Promise<TTSResult> {
    // Check cache
    const cached = this.cache.get(text, this.config.voice);
    if (cached) {
      return {
        audioBuffer: cached.audioBuffer,
        visemes: cached.visemes,
        duration: text.length * 0.15,
      };
    }

    if (this.config.provider === 'edge-tts') {
      return this.synthesizeEdgeTTS(text);
    }
    // web-speech doesn't produce ArrayBuffer, return empty
    const visemes = textToVisemes(text);
    return { audioBuffer: new ArrayBuffer(0), visemes, duration: text.length * 0.15 };
  }

  private async synthesizeEdgeTTS(text: string): Promise<TTSResult> {
    const { EdgeTTS } = await import('edge-tts-universal');
    const tts = new EdgeTTS(text, this.config.voice, {
      rate: this.config.rate,
      volume: this.config.volume,
      pitch: this.config.pitch,
    });

    const [result, visemes] = await Promise.all([
      tts.synthesize(),
      Promise.resolve(textToVisemes(text)),
    ]);

    if (!result.audio) throw new Error('No audio returned from TTS');

    const arrayBuffer = await result.audio.arrayBuffer();
    this.cache.set(text, this.config.voice, arrayBuffer, visemes);

    const duration = text.length * 0.15;
    const ttsResult: TTSResult = { audioBuffer: arrayBuffer, visemes, duration };
    this.eventBus.emit('tts:synthesis-complete', ttsResult);
    return ttsResult;
  }

  async speak(text: string): Promise<void> {
    this.eventBus.emit('tts:speaking-started', { text });
    this._isSpeaking = true;

    try {
      if (this.config.provider === 'edge-tts') {
        const result = await this.synthesize(text);
        await this.playAudio(result.audioBuffer);
      } else {
        await this.speakWebSpeech(text);
      }
    } finally {
      this._isSpeaking = false;
      this.eventBus.emit('tts:speaking-ended', { text });
    }
  }

  speakChunk(text: string): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (this.speechBufferTimeout !== null) {
      clearTimeout(this.speechBufferTimeout);
      this.speechBufferTimeout = null;
    }

    this.speechChunkBuffer += text;
    this.speechBufferTimeout = window.setTimeout(
      () => this.flushSpeechBuffer(),
      this.SPEAK_BUFFER_DELAY
    );
  }

  private flushSpeechBuffer(): void {
    if (this.speechChunkBuffer.length === 0) return;
    const segments = this.splitIntoSegments(this.speechChunkBuffer);
    this.speechSegmentQueue.push(...segments);
    this.speechChunkBuffer = '';
    if (!this.isSpeakingQueue) this.processSpeechQueue();
  }

  private splitIntoSegments(text: string): string[] {
    const segments: string[] = [];
    let remaining = text.trim();
    while (remaining.length > 0) {
      const sentenceMatch = remaining.match(/^.+?[.!?](?:\s+|$)/);
      if (sentenceMatch) {
        segments.push(sentenceMatch[0].trim());
        remaining = remaining.slice(sentenceMatch[0].length).trim();
      } else {
        const phraseMatch = remaining.match(/^.+?[;,](?:\s+|$)/);
        if (phraseMatch) {
          segments.push(phraseMatch[0].trim());
          remaining = remaining.slice(phraseMatch[0].length).trim();
        } else {
          if (remaining.length > 200) {
            const splitIndex = remaining.lastIndexOf(' ', 200);
            if (splitIndex > 50) {
              segments.push(remaining.slice(0, splitIndex).trim());
              remaining = remaining.slice(splitIndex).trim();
            } else {
              segments.push(remaining);
              remaining = '';
            }
          } else {
            segments.push(remaining);
            remaining = '';
          }
        }
      }
    }
    return segments.filter((s) => s.length > 0);
  }

  private processSpeechQueue(): void {
    if (this.speechSegmentQueue.length === 0) {
      this.isSpeakingQueue = false;
      return;
    }
    this.isSpeakingQueue = true;
    const text = this.speechSegmentQueue.shift()!;
    const utterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance = utterance;

    utterance.onend = () => {
      this.currentUtterance = null;
      this.processSpeechQueue();
    };
    utterance.onerror = () => {
      this.currentUtterance = null;
      this.processSpeechQueue();
    };

    window.speechSynthesis.speak(utterance);
    this.eventBus.emit('tts:chunk-spoken', { text });
  }

  stop(): void {
    // Stop Edge TTS audio
    if (this.currentAudioSource) {
      try {
        this.currentAudioSource.stop();
        this.currentAudioSource.disconnect();
      } catch {
        // Ignore errors during cleanup
      }
      this.currentAudioSource = null;
    }
    // Stop Web Speech
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      this.currentUtterance = null;
    }
    this.speechChunkBuffer = '';
    if (this.speechBufferTimeout !== null) {
      clearTimeout(this.speechBufferTimeout);
      this.speechBufferTimeout = null;
    }
    this.speechSegmentQueue = [];
    this.isSpeakingQueue = false;
    this._isSpeaking = false;
    this.eventBus.emit('tts:stopped', {});
  }

  isSpeaking(): boolean {
    return this._isSpeaking;
  }

  on<K extends keyof TTSEvents>(
    event: K,
    handler: (data: TTSEvents[K]) => void
  ): () => void {
    return this.eventBus.on(event, handler);
  }

  getAudioSource(): AudioBufferSourceNode | null {
    return this.currentAudioSource;
  }

  clearCache(): void {
    this.cache.clear();
  }

  dispose(): void {
    this.stop();
    this.eventBus.removeAllListeners();
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }

  // ---- Audio Playback ----

  private async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
    if (this.currentAudioSource) {
      try {
        this.currentAudioSource.stop();
        this.currentAudioSource.disconnect();
      } catch {
        // Ignore errors during cleanup
      }
      this.currentAudioSource = null;
    }

    if (!audioBuffer || audioBuffer.byteLength === 0) {
      throw new Error('Audio buffer is empty');
    }

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const decodedData = await this.audioContext.decodeAudioData(audioBuffer);
    const source = this.audioContext.createBufferSource();
    source.buffer = decodedData;
    this.currentAudioSource = source;

    source.connect(this.audioContext.destination);

    await new Promise<void>((resolve, reject) => {
      source.onended = () => {
        this.currentAudioSource = null;
        resolve();
      };
      source.addEventListener('error', (e) => {
        this.currentAudioSource = null;
        reject(new Error('Audio error: ' + e));
      });
      try {
        source.start(0);
      } catch (err) {
        this.currentAudioSource = null;
        reject(err);
      }
    });
  }

  private speakWebSpeech(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;
      utterance.onend = () => {
        this.currentUtterance = null;
        resolve();
      };
      utterance.onerror = (e) => {
        this.currentUtterance = null;
        reject(new Error('Speech synthesis failed: ' + e.error));
      };
      window.speechSynthesis.speak(utterance);
    });
  }
}
