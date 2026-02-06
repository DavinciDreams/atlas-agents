/**
 * Atlas Agents Centralized Configuration
 *
 * This module provides a centralized configuration system for all provider-specific
 * settings across the Atlas Agents ecosystem. All hardcoded values have been moved
 * here for easy configuration through environment variables, config files, or runtime options.
 *
 * @module config
 */

// ============================================================================
// Common Configuration Schemas
// ============================================================================

const DEFAULT_CONFIG = {
  // Speech TTS Defaults
  tts: {
    defaultProvider: 'edge-tts' as const,
    defaultVoice: 'en-GB-LibbyNeural',
    defaultRate: '+0%' as const,
    defaultPitch: '+0Hz' as const,
    defaultVolume: '+0%' as const,
    durationMultiplier: 0.15,
    bufferDelayMs: 150,
    maxSegmentLength: 200,
    minSplitIndex: 50,
  },

  // Speech STT Defaults
  stt: {
    defaultProvider: 'web-speech' as const,
    defaultLanguage: 'en-US' as const,
    webSpeechMaxAlternatives: 1,
    whisperModel: 'whisper-large-v3' as const,
    whisperResponseFormat: 'json' as const,
    sampleRate: 16000,
    audioFormatFallback: 'audio/webm;codecs=opus' as const,
    mediaRecorderTimesliceMs: 100,
    minAudioSizeBytes: 1000,
    maxRetries: 3,
    retryDelayMs: 1000,
  },

  // Avatar Defaults
  avatar: {
    animationBasePath: '/animations/' as const,
    defaultAnimation: 'modelPose' as const,
    animationFadeIn: 0.3,
    animationFadeOut: 0.2,
    targetHeight: 1.6,
    defaultLoopBehavior: 'repeat' as const,
    defaultDurationMs: 3000,
    cameraPosition: [0, 1.4, 3.5] as const,
    cameraFov: 40,
    renderer: {
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance' as const,
    },
    dprRange: [1, 2] as const,
    orbitControls: {
      enablePan: false,
      enableZoom: true,
      minPolarAngle: Math.PI / 6,
      maxPolarAngle: Math.PI / 2.2,
      minDistance: 2,
      maxDistance: 5,
      target: [0, 1.2, 0] as const,
      enableDamping: true,
      dampingFactor: 0.05,
    },
  },

  // Local Speech Server Defaults
  localSpeechServer: {
    serverUrl: 'ws://localhost:8765/ws' as const,
    corsOrigins: ['*'] as const,
    tts: {
      voice: 'af_heart',
      langCode: 'a' as const,
      device: 'cuda' as const,
      sampleRate: 24000,
      outputFormat: 'WAV' as const,
      outputSubtype: 'PCM_16' as const,
    },
    stt: {
      modelSize: 'base.en' as const,
      device: 'cuda' as const,
      computeType: 'float16' as const,
      language: 'en' as const,
      beamSize: 5,
      silenceThreshold: 0.01,
      silenceDuration: 1.5,
      audioFormat: 'webm-opus' as const,
      ffmpegSampleRate: 16000,
      ffmpegChannels: 1,
      decodeTimeout: 10,
      rmsTimeout: 5,
    },
  },
} as const;

// ============================================================================
// Configuration Classes
// ============================================================================

/**
 * Centralized configuration for Atlas Agents
 */
export class AtlasConfig {
  private static instance: AtlasConfig | null = null;

  private readonly config: typeof DEFAULT_CONFIG;

  private constructor(config: Partial<typeof DEFAULT_CONFIG> = {}) {
    this.config = this.mergeConfigs(DEFAULT_CONFIG, config);
  }

  /**
   * Get or create singleton configuration instance
   */
  static getInstance(config?: Partial<typeof DEFAULT_CONFIG>): AtlasConfig {
    if (!AtlasConfig.instance) {
      AtlasConfig.instance = new AtlasConfig(config);
    } else if (config) {
      AtlasConfig.instance = new AtlasConfig(config);
    }
    return AtlasConfig.instance;
  }

  /**
   * Create a new configuration instance (useful for testing)
   */
  static create(config: Partial<typeof DEFAULT_CONFIG>): AtlasConfig {
    return new AtlasConfig(config);
  }

  /**
   * Merge configuration objects with runtime overrides taking precedence
   */
  private mergeConfigs(
    defaults: typeof DEFAULT_CONFIG,
    overrides: Partial<typeof DEFAULT_CONFIG>
  ): typeof DEFAULT_CONFIG {
    const result: any = JSON.parse(JSON.stringify(defaults));

    if (overrides.tts) {
      result.tts = { ...defaults.tts, ...overrides.tts };
    }
    if (overrides.stt) {
      result.stt = { ...defaults.stt, ...overrides.stt };
    }
    if (overrides.avatar) {
      result.avatar = { ...defaults.avatar, ...overrides.avatar };
    }
    if (overrides.localSpeechServer) {
      result.localSpeechServer = { ...defaults.localSpeechServer, ...overrides.localSpeechServer };
    }

    return result;
  }

  // ============================================================================
  // Speech TTS Configuration
  // ============================================================================

  get tts() {
    return this.config.tts;
  }

  /**
   * Get TTS configuration with provider-specific overrides
   */
  getTTSConfig(provider?: 'edge-tts' | 'web-speech' | 'local') {
    const base = this.config.tts;

    switch (provider) {
      case 'edge-tts':
        return {
          ...base,
          provider: 'edge-tts' as const,
          voice: base.defaultVoice,
          rate: base.defaultRate,
          pitch: base.defaultPitch,
          volume: base.defaultVolume,
        };
      case 'web-speech':
        return {
          ...base,
          provider: 'web-speech' as const,
          voice: base.defaultVoice,
          rate: base.defaultRate,
          pitch: base.defaultPitch,
          volume: base.defaultVolume,
        };
      case 'local':
        return {
          ...base,
          provider: 'local' as const,
          voice: this.config.localSpeechServer.tts.voice,
        };
      default:
        return {
          ...base,
          provider: base.defaultProvider,
          voice: base.defaultVoice,
          rate: base.defaultRate,
          pitch: base.defaultPitch,
          volume: base.defaultVolume,
        };
    }
  }

  // ============================================================================
  // Speech STT Configuration
  // ============================================================================

  get stt() {
    return this.config.stt;
  }

  /**
   * Get STT configuration with provider-specific overrides
   */
  getSTTConfig(provider?: 'web-speech' | 'whisper' | 'local') {
    const base = this.config.stt;

    switch (provider) {
      case 'web-speech':
        return {
          ...base,
          provider: 'web-speech' as const,
          language: base.defaultLanguage,
        };
      case 'whisper':
        return {
          ...base,
          provider: 'whisper' as const,
          language: base.defaultLanguage,
          model: base.whisperModel,
          responseFormat: base.whisperResponseFormat,
        };
      case 'local':
        return {
          ...base,
          provider: 'local' as const,
          language: this.config.localSpeechServer.stt.language,
        };
      default:
        return {
          ...base,
          provider: base.defaultProvider,
          language: base.defaultLanguage,
        };
    }
  }

  /**
   * Get Whisper API configuration
   */
  getWhisperConfig(apiKey: string) {
    return {
      apiKey,
      apiUrl: (typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.WHISPER_API_URL) || 'https://api.groq.com/openai/v1/audio/transcriptions',
      model: this.config.stt.whisperModel,
      responseFormat: this.config.stt.whisperResponseFormat,
    };
  }

  // ============================================================================
  // Avatar Configuration
  // ============================================================================

  get avatar() {
    return this.config.avatar;
  }

  /**
   * Get animation duration for a specific animation name
   */
  getAnimationDuration(animationName: string): number {
    const durations: Record<string, number> = {
      idle: 3000,
      modelPose: 3000,
      greeting: 3000,
      peace: 2500,
      shoot: 2500,
      spin: 4000,
      squat: 3000,
      walking: 4000,
      hipHopDancing: 5000,
      punch: 2000,
      bowing: 3000,
      waving: 3000,
      headNod: 1500,
      shakingHeadNo: 1500,
      thumbsUp: 2000,
      thinking: 3000,
      salute: 2500,
      singing: 5000,
    };
    return durations[animationName] ?? this.config.avatar.defaultDurationMs;
  }

  /**
   * Get viseme to blend shape mapping for a specific model
   */
  getVisemeMapping(modelType: 'standard' | 'custom'): Record<string, string> {
    const standardMapping: Record<string, string> = {
      'sil': 'neutral',
      'PP': 'aa', 'FF': 'ih', 'TH': 'ih', 'DD': 'aa',
      'kk': 'aa', 'CH': 'ou', 'SS': 'ih', 'nn': 'aa',
      'RR': 'ou', 'aa': 'aa', 'E': 'ee', 'ih': 'ih',
      'oh': 'oh', 'ou': 'ou',
    };

    // Custom mappings can be extended here
    if (modelType === 'custom') {
      return { ...standardMapping };
    }

    return standardMapping;
  }

  // ============================================================================
  // Local Speech Server Configuration
  // ============================================================================

  get localSpeechServer() {
    return this.config.localSpeechServer;
  }

  /**
   * Get server configuration
   */
  getServerConfig(host?: string, port?: number) {
    return {
      host: host ?? '127.0.0.1',
      port: port ?? 8765,
      serverUrl: this.config.localSpeechServer.serverUrl,
      corsOrigins: this.config.localSpeechServer.corsOrigins,
    };
  }

  /**
   * Get TTS server configuration
   */
  getTTSServerConfig() {
    return {
      voice: this.config.localSpeechServer.tts.voice,
      langCode: this.config.localSpeechServer.tts.langCode,
      device: this.config.localSpeechServer.tts.device,
      sampleRate: this.config.localSpeechServer.tts.sampleRate,
      outputFormat: this.config.localSpeechServer.tts.outputFormat,
      outputSubtype: this.config.localSpeechServer.tts.outputSubtype,
    };
  }

  /**
   * Get STT server configuration
   */
  getSTTServerConfig() {
    return {
      modelSize: this.config.localSpeechServer.stt.modelSize,
      device: this.config.localSpeechServer.stt.device,
      computeType: this.config.localSpeechServer.stt.computeType,
      language: this.config.localSpeechServer.stt.language,
      beamSize: this.config.localSpeechServer.stt.beamSize,
      silenceThreshold: this.config.localSpeechServer.stt.silenceThreshold,
      silenceDuration: this.config.localSpeechServer.stt.silenceDuration,
      audioFormat: this.config.localSpeechServer.stt.audioFormat,
      ffmpegSampleRate: this.config.localSpeechServer.stt.ffmpegSampleRate,
      ffmpegChannels: this.config.localSpeechServer.stt.ffmpegChannels,
      decodeTimeout: this.config.localSpeechServer.stt.decodeTimeout,
      rmsTimeout: this.config.localSpeechServer.stt.rmsTimeout,
    };
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

let configInstance: AtlasConfig | null = null;

/**
 * Get current configuration instance
 */
export function getConfig(): AtlasConfig {
  if (!configInstance) {
    configInstance = AtlasConfig.getInstance();
  }
  return configInstance;
}

/**
 * Reset configuration instance (useful for testing)
 */
export function resetConfig(): void {
  configInstance = null;
}

/**
 * Load configuration from environment variables
 */
export function loadConfigFromEnv(): AtlasConfig {
  const env = (typeof globalThis !== 'undefined' && (globalThis as any).process?.env) || {};
  const config: any = {};

  // Load TTS config from env
  if (env.TTS_VOICE) {
    config.tts = { ...config.tts, defaultVoice: env.TTS_VOICE };
  }
  if (env.TTS_RATE) {
    config.tts = { ...config.tts, defaultRate: env.TTS_RATE };
  }
  if (env.TTS_PITCH) {
    config.tts = { ...config.tts, defaultPitch: env.TTS_PITCH };
  }
  if (env.TTS_VOLUME) {
    config.tts = { ...config.tts, defaultVolume: env.TTS_VOLUME };
  }
  if (env.TTS_DURATION_MULTIPLIER) {
    config.tts = { ...config.tts, durationMultiplier: parseFloat(env.TTS_DURATION_MULTIPLIER) };
  }
  if (env.TTS_BUFFER_DELAY_MS) {
    config.tts = { ...config.tts, bufferDelayMs: parseInt(env.TTS_BUFFER_DELAY_MS, 10) };
  }
  if (env.TTS_MAX_SEGMENT_LENGTH) {
    config.tts = { ...config.tts, maxSegmentLength: parseInt(env.TTS_MAX_SEGMENT_LENGTH, 10) };
  }
  if (env.TTS_MIN_SPLIT_INDEX) {
    config.tts = { ...config.tts, minSplitIndex: parseInt(env.TTS_MIN_SPLIT_INDEX, 10) };
  }

  // Load STT config from env
  if (env.STT_LANGUAGE) {
    config.stt = { ...config.stt, defaultLanguage: env.STT_LANGUAGE };
  }
  if (env.STT_WEB_SPEECH_MAX_ALTERNATIVES) {
    config.stt = { ...config.stt, webSpeechMaxAlternatives: parseInt(env.STT_WEB_SPEECH_MAX_ALTERNATIVES, 10) };
  }
  if (env.STT_WHISPER_MODEL) {
    config.stt = { ...config.stt, whisperModel: env.STT_WHISPER_MODEL };
  }
  if (env.STT_WHISPER_RESPONSE_FORMAT) {
    config.stt = { ...config.stt, whisperResponseFormat: env.STT_WHISPER_RESPONSE_FORMAT };
  }
  if (env.STT_SAMPLE_RATE) {
    config.stt = { ...config.stt, sampleRate: parseInt(env.STT_SAMPLE_RATE, 10) };
  }
  if (env.STT_AUDIO_FORMAT_FALLBACK) {
    config.stt = { ...config.stt, audioFormatFallback: env.STT_AUDIO_FORMAT_FALLBACK };
  }
  if (env.STT_MEDIA_RECORDER_TIMESLICE_MS) {
    config.stt = { ...config.stt, mediaRecorderTimesliceMs: parseInt(env.STT_MEDIA_RECORDER_TIMESLICE_MS, 10) };
  }
  if (env.STT_MIN_AUDIO_SIZE_BYTES) {
    config.stt = { ...config.stt, minAudioSizeBytes: parseInt(env.STT_MIN_AUDIO_SIZE_BYTES, 10) };
  }
  if (env.STT_MAX_RETRIES) {
    config.stt = { ...config.stt, maxRetries: parseInt(env.STT_MAX_RETRIES, 10) };
  }
  if (env.STT_RETRY_DELAY_MS) {
    config.stt = { ...config.stt, retryDelayMs: parseInt(env.STT_RETRY_DELAY_MS, 10) };
  }

  // Load Avatar config from env
  if (env.AVATAR_ANIMATION_BASE_PATH) {
    config.avatar = { ...config.avatar, animationBasePath: env.AVATAR_ANIMATION_BASE_PATH };
  }
  if (env.AVATAR_DEFAULT_ANIMATION) {
    config.avatar = { ...config.avatar, defaultAnimation: env.AVATAR_DEFAULT_ANIMATION };
  }
  if (env.AVATAR_ANIMATION_FADE_IN) {
    config.avatar = { ...config.avatar, animationFadeIn: parseFloat(env.AVATAR_ANIMATION_FADE_IN) };
  }
  if (env.AVATAR_ANIMATION_FADE_OUT) {
    config.avatar = { ...config.avatar, animationFadeOut: parseFloat(env.AVATAR_ANIMATION_FADE_OUT) };
  }
  if (env.AVATAR_TARGET_HEIGHT) {
    config.avatar = { ...config.avatar, targetHeight: parseFloat(env.AVATAR_TARGET_HEIGHT) };
  }
  if (env.AVATAR_DEFAULT_DURATION_MS) {
    config.avatar = { ...config.avatar, defaultDurationMs: parseInt(env.AVATAR_DEFAULT_DURATION_MS, 10) };
  }
  if (env.AVATAR_CAMERA_POSITION) {
    try {
      config.avatar = { ...config.avatar, cameraPosition: JSON.parse(env.AVATAR_CAMERA_POSITION) };
    } catch {
      console.warn('Invalid AVATAR_CAMERA_POSITION format, using default');
    }
  }
  if (env.AVATAR_CAMERA_FOV) {
    config.avatar = { ...config.avatar, cameraFov: parseInt(env.AVATAR_CAMERA_FOV, 10) };
  }
  if (env.AVATAR_RENDERER_ANTIALIAS !== undefined) {
    config.avatar = { 
      ...config.avatar, 
      renderer: { ...config.avatar?.renderer, antialias: env.AVATAR_RENDERER_ANTIALIAS === 'true' } 
    };
  }
  if (env.AVATAR_RENDERER_ALPHA !== undefined) {
    config.avatar = { 
      ...config.avatar, 
      renderer: { ...config.avatar?.renderer, alpha: env.AVATAR_RENDERER_ALPHA === 'true' } 
    };
  }
  if (env.AVATAR_RENDERER_POWER_PREFERENCE) {
    config.avatar = { 
      ...config.avatar, 
      renderer: { ...config.avatar?.renderer, powerPreference: env.AVATAR_RENDERER_POWER_PREFERENCE as any } 
    };
  }
  if (env.AVATAR_DPR_MIN) {
    const min = parseFloat(env.AVATAR_DPR_MIN);
    config.avatar = { ...config.avatar, dprRange: [min, config.avatar?.dprRange?.[1] ?? 2] };
  }
  if (env.AVATAR_DPR_MAX) {
    const max = parseFloat(env.AVATAR_DPR_MAX);
    config.avatar = { ...config.avatar, dprRange: [config.avatar?.dprRange?.[0] ?? 1, max] };
  }

  // Load Local Speech Server config from env
  if (env.LOCAL_SPEECH_SERVER_URL) {
    config.localSpeechServer = { ...config.localSpeechServer, serverUrl: env.LOCAL_SPEECH_SERVER_URL };
  }
  if (env.LOCAL_SPEECH_SERVER_CORS_ORIGINS) {
    try {
      config.localSpeechServer = { ...config.localSpeechServer, corsOrigins: JSON.parse(env.LOCAL_SPEECH_SERVER_CORS_ORIGINS) };
    } catch {
      console.warn('Invalid LOCAL_SPEECH_SERVER_CORS_ORIGINS format, using default');
    }
  }
  if (env.LOCAL_TTS_VOICE) {
    config.localSpeechServer = { 
      ...config.localSpeechServer, 
      tts: { ...config.localSpeechServer?.tts, voice: env.LOCAL_TTS_VOICE } 
    };
  }
  if (env.LOCAL_TTS_LANG_CODE) {
    config.localSpeechServer = { 
      ...config.localSpeechServer, 
      tts: { ...config.localSpeechServer?.tts, langCode: env.LOCAL_TTS_LANG_CODE } 
    };
  }
  if (env.LOCAL_TTS_DEVICE) {
    config.localSpeechServer = { 
      ...config.localSpeechServer, 
      tts: { ...config.localSpeechServer?.tts, device: env.LOCAL_TTS_DEVICE } 
    };
  }
  if (env.LOCAL_TTS_SAMPLE_RATE) {
    config.localSpeechServer = { 
      ...config.localSpeechServer, 
      tts: { ...config.localSpeechServer?.tts, sampleRate: parseInt(env.LOCAL_TTS_SAMPLE_RATE, 10) } 
    };
  }
  if (env.LOCAL_STT_MODEL_SIZE) {
    config.localSpeechServer = { 
      ...config.localSpeechServer, 
      stt: { ...config.localSpeechServer?.stt, modelSize: env.LOCAL_STT_MODEL_SIZE } 
    };
  }
  if (env.LOCAL_STT_DEVICE) {
    config.localSpeechServer = { 
      ...config.localSpeechServer, 
      stt: { ...config.localSpeechServer?.stt, device: env.LOCAL_STT_DEVICE } 
    };
  }
  if (env.LOCAL_STT_COMPUTE_TYPE) {
    config.localSpeechServer = { 
      ...config.localSpeechServer, 
      stt: { ...config.localSpeechServer?.stt, computeType: env.LOCAL_STT_COMPUTE_TYPE } 
    };
  }
  if (env.LOCAL_STT_LANGUAGE) {
    config.localSpeechServer = { 
      ...config.localSpeechServer, 
      stt: { ...config.localSpeechServer?.stt, language: env.LOCAL_STT_LANGUAGE } 
    };
  }
  if (env.LOCAL_STT_BEAM_SIZE) {
    config.localSpeechServer = { 
      ...config.localSpeechServer, 
      stt: { ...config.localSpeechServer?.stt, beamSize: parseInt(env.LOCAL_STT_BEAM_SIZE, 10) } 
    };
  }
  if (env.LOCAL_STT_SILENCE_THRESHOLD) {
    config.localSpeechServer = { 
      ...config.localSpeechServer, 
      stt: { ...config.localSpeechServer?.stt, silenceThreshold: parseFloat(env.LOCAL_STT_SILENCE_THRESHOLD) } 
    };
  }
  if (env.LOCAL_STT_SILENCE_DURATION) {
    config.localSpeechServer = { 
      ...config.localSpeechServer, 
      stt: { ...config.localSpeechServer?.stt, silenceDuration: parseFloat(env.LOCAL_STT_SILENCE_DURATION) } 
    };
  }
  if (env.LOCAL_STT_AUDIO_FORMAT) {
    config.localSpeechServer = { 
      ...config.localSpeechServer, 
      stt: { ...config.localSpeechServer?.stt, audioFormat: env.LOCAL_STT_AUDIO_FORMAT } 
    };
  }
  if (env.LOCAL_FFMPEG_SAMPLE_RATE) {
    config.localSpeechServer = { 
      ...config.localSpeechServer, 
      stt: { ...config.localSpeechServer?.stt, ffmpegSampleRate: parseInt(env.LOCAL_FFMPEG_SAMPLE_RATE, 10) } 
    };
  }
  if (env.LOCAL_FFMPEG_CHANNELS) {
    config.localSpeechServer = { 
      ...config.localSpeechServer, 
      stt: { ...config.localSpeechServer?.stt, ffmpegChannels: parseInt(env.LOCAL_FFMPEG_CHANNELS, 10) } 
    };
  }
  if (env.LOCAL_FFMPEG_DECODE_TIMEOUT) {
    config.localSpeechServer = { 
      ...config.localSpeechServer, 
      stt: { ...config.localSpeechServer?.stt, decodeTimeout: parseInt(env.LOCAL_FFMPEG_DECODE_TIMEOUT, 10) } 
    };
  }
  if (env.LOCAL_FFMPEG_RMS_TIMEOUT) {
    config.localSpeechServer = { 
      ...config.localSpeechServer, 
      stt: { ...config.localSpeechServer?.stt, rmsTimeout: parseInt(env.LOCAL_FFMPEG_RMS_TIMEOUT, 10) } 
    };
  }

  return AtlasConfig.getInstance(config);
}

// ============================================================================
// Type Exports
// ============================================================================

export type TTSConfig = typeof DEFAULT_CONFIG['tts'];
export type STTConfig = typeof DEFAULT_CONFIG['stt'];
export type AvatarConfig = typeof DEFAULT_CONFIG['avatar'];
export type LocalSpeechServerConfig = typeof DEFAULT_CONFIG['localSpeechServer'];
export type WhisperConfig = ReturnType<typeof AtlasConfig.prototype.getWhisperConfig>;
