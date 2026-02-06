import { createEventBus, type EventBus, type STTEvents } from '@atlas.agents/types';

export interface STTConfig {
  provider?: 'web-speech' | 'whisper';
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  whisper?: {
    apiKey: string;
    apiUrl?: string;
    model?: string;
  };
}

export class STTService {
  private config: Required<Pick<STTConfig, 'provider' | 'language' | 'continuous' | 'interimResults'>> & Pick<STTConfig, 'whisper'>;
  private eventBus: EventBus<STTEvents>;
  private _isListening = false;

  // Web Speech API
  private recognition: SpeechRecognition | null = null;
  private retryCount = 0;
  private readonly MAX_RETRIES = 3;

  // Whisper
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioStream: MediaStream | null = null;

  constructor(config: STTConfig = {}) {
    this.config = {
      provider: config.provider ?? this.detectProvider(),
      language: config.language ?? 'en-US',
      continuous: config.continuous ?? false,
      interimResults: config.interimResults ?? false,
      whisper: config.whisper,
    };
    this.eventBus = createEventBus<STTEvents>();
  }

  private detectProvider(): 'web-speech' | 'whisper' {
    if (typeof window !== 'undefined' && (window.SpeechRecognition || (window as any).webkitSpeechRecognition)) {
      return 'web-speech';
    }
    return 'whisper';
  }

  async start(): Promise<void> {
    if (this._isListening) return;

    if (this.config.provider === 'web-speech') {
      await this.startWebSpeech();
    } else {
      await this.startWhisper();
    }
  }

  stop(): void {
    if (!this._isListening) return;

    if (this.config.provider === 'web-speech') {
      this.stopWebSpeech();
    } else {
      this.stopWhisper();
    }
  }

  isListening(): boolean {
    return this._isListening;
  }

  on<K extends keyof STTEvents>(event: K, handler: (data: STTEvents[K]) => void): () => void {
    return this.eventBus.on(event, handler);
  }

  dispose(): void {
    this.stop();
    this.eventBus.removeAllListeners();
  }

  // ---- Web Speech API ----

  private async startWebSpeech(): Promise<void> {
    const SpeechRecognitionCtor = (typeof window !== 'undefined')
      ? (window.SpeechRecognition || (window as any).webkitSpeechRecognition)
      : null;

    if (!SpeechRecognitionCtor) {
      this.eventBus.emit('stt:error', { error: new Error('Web Speech API not supported'), type: 'not-supported' });
      return;
    }

    this.recognition = new SpeechRecognitionCtor();
    this.recognition.continuous = this.config.continuous;
    this.recognition.lang = this.config.language;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence;

      if (result.isFinal) {
        this.eventBus.emit('stt:final-transcript', { text: transcript, confidence });
      } else {
        this.eventBus.emit('stt:interim-transcript', { text: transcript, confidence });
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'aborted') return;
      this.eventBus.emit('stt:error', { error: new Error(event.message || event.error), type: event.error });

      if (event.error === 'network' && this.retryCount < this.MAX_RETRIES) {
        this.retryCount++;
        setTimeout(() => {
          try { this.recognition?.start(); } catch { /* ignore */ }
        }, 1000 * this.retryCount);
      }
    };

    this.recognition.onend = () => {
      if (this._isListening && this.config.continuous) {
        try { this.recognition?.start(); } catch { /* ignore */ }
      } else {
        this._isListening = false;
        this.eventBus.emit('stt:stopped', {});
      }
    };

    try {
      this.recognition.start();
      this._isListening = true;
      this.retryCount = 0;
      this.eventBus.emit('stt:started', {});
    } catch (error) {
      this.eventBus.emit('stt:error', { error: error as Error, type: 'start-failed' });
    }
  }

  private stopWebSpeech(): void {
    if (this.recognition) {
      try { this.recognition.stop(); } catch { /* ignore */ }
      this.recognition = null;
    }
    this._isListening = false;
    this.eventBus.emit('stt:stopped', {});
  }

  // ---- Whisper (Groq) ----

  private async startWhisper(): Promise<void> {
    if (!this.config.whisper?.apiKey) {
      this.eventBus.emit('stt:error', { error: new Error('Whisper API key required'), type: 'config' });
      return;
    }

    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 }
      });

      this.audioChunks = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus' : 'audio/webm';

      this.mediaRecorder = new MediaRecorder(this.audioStream, { mimeType });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = () => this.processWhisperAudio();

      this.mediaRecorder.onerror = () => {
        this._isListening = false;
        this.cleanupWhisper();
        this.eventBus.emit('stt:error', { error: new Error('MediaRecorder error'), type: 'recording' });
      };

      this.mediaRecorder.start(100);
      this._isListening = true;
      this.eventBus.emit('stt:started', {});
    } catch (error) {
      this._isListening = false;
      this.eventBus.emit('stt:error', { error: error as Error, type: 'mic-access' });
    }
  }

  private stopWhisper(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }
  }

  private async processWhisperAudio(): Promise<void> {
    if (this.audioChunks.length === 0) {
      this._isListening = false;
      this.eventBus.emit('stt:stopped', {});
      return;
    }

    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
    if (audioBlob.size < 1000) {
      this._isListening = false;
      this.eventBus.emit('stt:stopped', {});
      return;
    }

    const apiUrl = this.config.whisper?.apiUrl ?? 'https://api.groq.com/openai/v1/audio/transcriptions';
    const model = this.config.whisper?.model ?? 'whisper-large-v3';

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', model);
      formData.append('language', this.config.language.split('-')[0]);
      formData.append('response_format', 'json');

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.config.whisper!.apiKey}` },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Whisper API error: ${response.status}`);
      }

      const result = await response.json();
      const transcript = result.text?.trim();

      if (transcript) {
        this.eventBus.emit('stt:final-transcript', { text: transcript, confidence: 1.0 });
      }
    } catch (error) {
      this.eventBus.emit('stt:error', { error: error as Error, type: 'transcription' });
    } finally {
      this._isListening = false;
      this.cleanupWhisper();
      this.eventBus.emit('stt:stopped', {});
    }
  }

  private cleanupWhisper(): void {
    this.audioChunks = [];
    this.mediaRecorder = null;
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }
  }
}
