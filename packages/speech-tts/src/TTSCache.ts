import type { VisemeData } from '@atlas-agents/types';

interface CacheEntry {
  audioBuffer: ArrayBuffer;
  visemes: VisemeData[];
  timestamp: number;
}

export class TTSCache {
  private cache = new Map<string, CacheEntry>();

  constructor(
    private maxSize: number = 50,
    private ttlMs: number = 300000
  ) {}

  private makeKey(text: string, voice: string): string {
    return `${voice}:${text}`;
  }

  get(text: string, voice: string): CacheEntry | undefined {
    const key = this.makeKey(text, voice);
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }
    return entry;
  }

  set(
    text: string,
    voice: string,
    audioBuffer: ArrayBuffer,
    visemes: VisemeData[]
  ): void {
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(this.makeKey(text, voice), {
      audioBuffer,
      visemes,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; maxSize: number } {
    return { size: this.cache.size, maxSize: this.maxSize };
  }
}
