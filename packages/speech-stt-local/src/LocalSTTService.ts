import { createEventBus, type EventBus, type STTEvents } from '@atlas.agents/types';
import { getConfig } from '@atlas.agents/config';

export interface LocalSTTConfig {
  serverUrl?: string;
  language?: string;
}

export class LocalSTTService {
  private serverUrl: string;
  private language: string;
  private eventBus: EventBus<STTEvents>;
  private _isListening = false;

  // WebSocket
  private ws: WebSocket | null = null;
  private wsConnecting: Promise<void> | null = null;

  // Streaming STT session
  private sessionId: string | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;

  constructor(config: LocalSTTConfig = {}) {
    const globalConfig = getConfig();
    this.serverUrl = config.serverUrl ?? globalConfig.localSpeechServer.serverUrl;
    this.language = config.language ?? globalConfig.localSpeechServer.stt.language;
    this.eventBus = createEventBus<STTEvents>();
  }

  // ---------------------------------------------------------------------------
  // Public API (matches STTService interface)
  // ---------------------------------------------------------------------------

  async start(): Promise<void> {
    if (this._isListening) return;

    try {
      await this.ensureWebSocket();
    } catch {
      this.eventBus.emit('stt:error', {
        error: new Error('Local speech server not available'),
        type: 'connection',
      });
      return;
    }

    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: getConfig().stt.sampleRate },
      });
    } catch (error) {
      this.eventBus.emit('stt:error', { error: error as Error, type: 'mic-access' });
      return;
    }

    this.sessionId = crypto.randomUUID();

    // Tell server we're starting a session
    this.ws!.send(
      JSON.stringify({
        type: 'stt:start',
        id: this.sessionId,
        language: this.language,
      })
    );

    const mimeType = MediaRecorder.isTypeSupported(getConfig().stt.audioFormatFallback)
      ? getConfig().stt.audioFormatFallback
      : 'audio/webm';

    this.mediaRecorder = new MediaRecorder(this.audioStream, { mimeType });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && this.ws && this.ws.readyState === WebSocket.OPEN && this.sessionId) {
        // Send JSON header then binary audio
        this.ws.send(
          JSON.stringify({
            type: 'stt:audio',
            id: this.sessionId,
            format: getConfig().localSpeechServer.stt.audioFormat,
          })
        );
        event.data.arrayBuffer().then((buf) => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(buf);
          }
        });
      }
    };

    this.mediaRecorder.onerror = () => {
      this._isListening = false;
      this.cleanup();
      this.eventBus.emit('stt:error', {
        error: new Error('MediaRecorder error'),
        type: 'recording',
      });
    };

    // Stream chunks every 1 second
    this.mediaRecorder.start(getConfig().stt.mediaRecorderTimesliceMs);
    this._isListening = true;
    this.eventBus.emit('stt:started', {});
  }

  stop(): void {
    if (!this._isListening) return;

    // Stop recording
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    // Tell server to finalize
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.sessionId) {
      this.ws.send(
        JSON.stringify({
          type: 'stt:stop',
          id: this.sessionId,
        })
      );
    }

    this.cleanup();
    this._isListening = false;
    this.eventBus.emit('stt:stopped', {});
  }

  isListening(): boolean {
    return this._isListening;
  }

  on<K extends keyof STTEvents>(event: K, handler: (data: STTEvents[K]) => void): () => void {
    return this.eventBus.on(event, handler);
  }

  dispose(): void {
    this.stop();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.wsConnecting = null;
    this.eventBus.removeAllListeners();
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
    if (typeof event.data !== 'string') return;

    const msg = JSON.parse(event.data);

    if (msg.id !== this.sessionId) return;

    if (msg.type === 'stt:interim') {
      this.eventBus.emit('stt:interim-transcript', {
        text: msg.text,
        confidence: msg.confidence ?? 0.8,
      });
    } else if (msg.type === 'stt:final') {
      this.eventBus.emit('stt:final-transcript', {
        text: msg.text,
        confidence: msg.confidence ?? 1.0,
      });
    } else if (msg.type === 'stt:end-of-speech') {
      // Server detected silence — auto-stop
      this.autoStop();
    } else if (msg.type === 'stt:error') {
      this.eventBus.emit('stt:error', {
        error: new Error(msg.error),
        type: 'transcription',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private autoStop(): void {
    if (!this._isListening) return;

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    this.cleanup();
    this._isListening = false;
    this.eventBus.emit('stt:stopped', {});
  }

  private cleanup(): void {
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
    }
    this.mediaRecorder = null;
    this.sessionId = null;
  }
}
