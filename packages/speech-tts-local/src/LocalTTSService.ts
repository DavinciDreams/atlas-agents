import { createEventBus, type EventBus, type TTSEvents, type VisemeData } from '@atlas.agents/types';
import { textToVisemes, TTSCache } from '@atlas.agents/speech-tts';
import { getConfig } from '@atlas.agents/config';

export interface LocalTTSConfig {
  serverUrl?: string;
  voice?: string;
  cacheSize?: number;
  cacheTtlMs?: number;
}

export interface TTSResult {
  audioBuffer: ArrayBuffer;
  visemes: VisemeData[];
  duration: number;
}

export class LocalTTSService {
  private serverUrl: string;
  private voice: string;
  private eventBus: EventBus<TTSEvents>;
  private cache: TTSCache;
  private _isSpeaking = false;
  private audioContext: AudioContext | null = null;
  private currentAudioSource: AudioBufferSourceNode | null = null;

  // WebSocket
  private ws: WebSocket | null = null;
  private wsConnecting: Promise<void> | null = null;
  private pendingTTS = new Map<
    string,
    { resolve: (result: TTSResult) => void; reject: (error: Error) => void; text: string }
  >();
  private pendingMeta: { id: string; byteLength: number } | null = null;

  // Streaming chunk queue
  private chunkBuffer = '';
  private chunkBufferTimeout: number | null = null;
  private audioSegmentQueue: string[] = [];
  private isPlayingQueue = false;
  private readonly CHUNK_BUFFER_DELAY: number;

  constructor(config: LocalTTSConfig = {}) {
    const globalConfig = getConfig();
    this.CHUNK_BUFFER_DELAY = globalConfig.tts.bufferDelayMs;
    this.serverUrl = config.serverUrl ?? globalConfig.localSpeechServer.serverUrl;
    this.voice = config.voice ?? globalConfig.localSpeechServer.tts.voice;
    this.eventBus = createEventBus<TTSEvents>();
    this.cache = new TTSCache(config.cacheSize, config.cacheTtlMs);
  }

  // ---------------------------------------------------------------------------
  // Public API (matches TTSService interface)
  // ---------------------------------------------------------------------------

  async synthesize(text: string): Promise<TTSResult> {
    const cached = this.cache.get(text, this.voice);
    if (cached) {
      return {
        audioBuffer: cached.audioBuffer,
        visemes: cached.visemes,
        duration: text.length * getConfig().tts.durationMultiplier,
      };
    }

    await this.ensureWebSocket();

    const id = crypto.randomUUID();

    return new Promise<TTSResult>((resolve, reject) => {
      this.pendingTTS.set(id, { resolve, reject, text });

      this.ws!.send(
        JSON.stringify({
          type: 'tts:synthesize',
          id,
          text,
          voice: this.voice,
        })
      );

      // Timeout
      setTimeout(() => {
        if (this.pendingTTS.has(id)) {
          this.pendingTTS.delete(id);
          reject(new Error('TTS request timed out'));
        }
      }, 30_000);
    });
  }

  async speak(text: string): Promise<void> {
    this.eventBus.emit('tts:speaking-started', { text });
    this._isSpeaking = true;

    try {
      const result = await this.synthesize(text);
      await this.playAudio(result.audioBuffer);
    } finally {
      this._isSpeaking = false;
      this.eventBus.emit('tts:speaking-ended', { text });
    }
  }

  speakChunk(text: string): void {
    if (this.chunkBufferTimeout !== null) {
      clearTimeout(this.chunkBufferTimeout);
      this.chunkBufferTimeout = null;
    }

    this.chunkBuffer += text;
    this.chunkBufferTimeout = window.setTimeout(
      () => this.flushChunkBuffer(),
      getConfig().tts.bufferDelayMs
    );
  }

  stop(): void {
    // Stop current audio
    if (this.currentAudioSource) {
      try {
        this.currentAudioSource.stop();
        this.currentAudioSource.disconnect();
      } catch {
        // Ignore errors during cleanup
      }
      this.currentAudioSource = null;
    }

    // Clear chunk queue
    this.chunkBuffer = '';
    if (this.chunkBufferTimeout !== null) {
      clearTimeout(this.chunkBufferTimeout);
      this.chunkBufferTimeout = null;
    }
    this.audioSegmentQueue = [];
    this.isPlayingQueue = false;

    // Reject pending requests
    for (const [, pending] of this.pendingTTS) {
      pending.reject(new Error('TTS stopped'));
    }
    this.pendingTTS.clear();
    this.pendingMeta = null;

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
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.wsConnecting = null;
    this.eventBus.removeAllListeners();
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }

  // ---------------------------------------------------------------------------
  // WebSocket management
  // ---------------------------------------------------------------------------

  private ensureWebSocket(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }
    if (this.wsConnecting) return this.wsConnecting;

    this.wsConnecting = new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(this.serverUrl);
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        this.ws = ws;
        this.wsConnecting = null;
        resolve();
      };

      ws.onerror = () => {
        this.wsConnecting = null;
        reject(new Error('WebSocket connection to speech server failed'));
      };

      ws.onclose = () => {
        this.ws = null;
        this.wsConnecting = null;
      };

      ws.onmessage = (event) => this.handleMessage(event);
    });

    return this.wsConnecting;
  }

  private handleMessage(event: MessageEvent): void {
    if (event.data instanceof ArrayBuffer) {
      // Binary frame = audio data for the pending TTS result
      if (this.pendingMeta) {
        const pending = this.pendingTTS.get(this.pendingMeta.id);
        if (pending) {
          const visemes = textToVisemes(pending.text);
          const duration = pending.text.length * getConfig().tts.durationMultiplier;
          const result: TTSResult = {
            audioBuffer: event.data,
            visemes,
            duration,
          };
          this.cache.set(pending.text, this.voice, event.data, visemes);
          this.eventBus.emit('tts:synthesis-complete', result);
          pending.resolve(result);
          this.pendingTTS.delete(this.pendingMeta.id);
        }
        this.pendingMeta = null;
      }
    } else {
      const msg = JSON.parse(event.data as string);

      if (msg.type === 'tts:result') {
        this.pendingMeta = { id: msg.id, byteLength: msg.byteLength };
      } else if (msg.type === 'tts:error') {
        const pending = this.pendingTTS.get(msg.id);
        if (pending) {
          pending.reject(new Error(msg.error));
          this.pendingTTS.delete(msg.id);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Streaming chunk support
  // ---------------------------------------------------------------------------

  private flushChunkBuffer(): void {
    if (this.chunkBuffer.length === 0) return;
    const segments = this.splitIntoSegments(this.chunkBuffer);
    this.chunkBuffer = '';
    this.audioSegmentQueue.push(...segments);
    if (!this.isPlayingQueue) {
      this.processSegmentQueue();
    }
  }

  private async processSegmentQueue(): Promise<void> {
    if (this.audioSegmentQueue.length === 0) {
      this.isPlayingQueue = false;
      return;
    }
    this.isPlayingQueue = true;
    const text = this.audioSegmentQueue.shift()!;
    try {
      const result = await this.synthesize(text);
      await this.playAudio(result.audioBuffer);
      this.eventBus.emit('tts:chunk-spoken', { text });
    } catch (err) {
      console.error('[LocalTTS] Chunk synthesis error:', err);
    }
    this.processSegmentQueue();
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
          if (remaining.length > getConfig().tts.maxSegmentLength) {
            const splitIndex = remaining.lastIndexOf(' ', getConfig().tts.maxSegmentLength);
            if (splitIndex > getConfig().tts.minSplitIndex) {
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

  // ---------------------------------------------------------------------------
  // Audio playback
  // ---------------------------------------------------------------------------

  private async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
    if (this.currentAudioSource) {
      try {
        this.currentAudioSource.stop();
        this.currentAudioSource.disconnect();
      } catch {
        // Ignore
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
}
