declare module 'edge-tts-universal' {
  interface EdgeTTSOptions {
    rate?: string;
    volume?: string;
    pitch?: string;
  }

  interface EdgeTTSResult {
    audio: Blob | null;
  }

  export class EdgeTTS {
    constructor(text: string, voice: string, options?: EdgeTTSOptions);
    synthesize(): Promise<EdgeTTSResult>;
  }
}
