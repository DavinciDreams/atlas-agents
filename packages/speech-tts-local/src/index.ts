export { LocalTTSService } from './LocalTTSService';
export type { LocalTTSConfig, TTSResult } from './LocalTTSService';
export type { TTSEvents } from '@atlas.agents/types';

export async function checkLocalSpeechServer(
  url: string = 'http://localhost:8765/health'
): Promise<{
  available: boolean;
  tts?: { voice: string; sampleRate: number };
  stt?: { model: string; language: string };
}> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
    if (response.ok) {
      const data = await response.json();
      return { available: true, tts: data.tts, stt: data.stt };
    }
  } catch {
    // Server not running
  }
  return { available: false };
}
