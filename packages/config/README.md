# Atlas Agents Configuration System

## Overview

The Atlas Agents configuration system provides a centralized, type-safe way to manage all provider-specific settings across the ecosystem. This eliminates hardcoded values scattered throughout the codebase and provides a single source of truth for configuration.

## Installation

```bash
npm install @atlas.agents/config
```

## Quick Start

```typescript
import { getConfig, loadConfigFromEnv } from '@atlas.agents/config';

// Get the singleton instance
const config = getConfig();

// Load configuration from environment variables
const config = loadConfigFromEnv();
```

## Configuration Categories

### 1. Speech TTS Configuration

Controls text-to-speech behavior across all TTS providers.

| Environment Variable | Type | Default | Description |
|-----------------|------|-----------|-------------|
| `TTS_PROVIDER` | `'edge-tts'` \| `'web-speech'` | Default TTS provider |
| `TTS_VOICE` | `'en-GB-LibbyNeural'` | Default voice |
| `TTS_RATE` | `'+0%'` | Speech rate |
| `TTS_PITCH` | `'+0Hz'` | Speech pitch |
| `TTS_VOLUME` | `'+0%'` | Speech volume |
| `TTS_DURATION_MULTIPLIER` | `0.15` | Text length to duration multiplier |
| `TTS_BUFFER_DELAY_MS` | `150` | Buffer delay for streaming (ms) |
| `TTS_MAX_SEGMENT_LENGTH` | `200` | Max segment length for text splitting |
| `TTS_MIN_SPLIT_INDEX` | `50` | Minimum split index |

### 2. Speech STT Configuration

Controls speech-to-text behavior across all STT providers.

| Environment Variable | Type | Default | Description |
|-----------------|------|-----------|-------------|
| `STT_LANGUAGE` | `'en-US'` | Default language |
| `STT_WEB_SPEECH_MAX_ALTERNATIVES` | `1` | Web Speech API max alternatives |
| `STT_WHISPER_MODEL` | `'whisper-large-v3'` | Default Whisper model |
| `STT_WHISPER_RESPONSE_FORMAT` | `'json'` | API response format |
| `STT_SAMPLE_RATE` | `16000` | Audio sample rate (Hz) |
| `STT_AUDIO_FORMAT_FALLBACK` | `'audio/webm;codecs=opus'` | Audio format fallback |
| `STT_MEDIA_RECORDER_TIMESLICE_MS` | `100` | MediaRecorder timeslice (ms) |
| `STT_MIN_AUDIO_SIZE_BYTES` | `1000` | Minimum audio size threshold |
| `STT_MAX_RETRIES` | `3` | Max retry attempts |
| `STT_RETRY_DELAY_MS` | `1000` | Base retry delay (ms) |
| `WHISPER_API_KEY` | - | Whisper API key (required) |
| `WHISPER_API_URL` | `'https://api.groq.com/openai/v1/audio/transcriptions'` | Whisper API endpoint |

### 3. Avatar Configuration

Controls avatar rendering and animation behavior.

| Environment Variable | Type | Default | Description |
|-----------------|------|-----------|-------------|
| `AVATAR_ANIMATION_BASE_PATH` | `'/animations/'` | Animation files path |
| `AVATAR_DEFAULT_ANIMATION` | `'modelPose'` | Default animation |
| `AVATAR_ANIMATION_FADE_IN` | `0.3` | Animation fade in duration (s) |
| `AVATAR_ANIMATION_FADE_OUT` | `0.2` | Animation fade out duration (s) |
| `AVATAR_TARGET_HEIGHT` | `1.6` | Model auto-scale target height (m) |
| `AVATAR_DEFAULT_DURATION_MS` | `3000` | Default animation duration (ms) |
| `AVATAR_CAMERA_POSITION` | `'[0, 1.4, 3.5]'` | Default camera position |
| `AVATAR_CAMERA_FOV` | `40` | Default camera field of view |
| `AVATAR_RENDERER_ANTIALIAS` | `false` | WebGL antialiasing |
| `AVATAR_RENDERER_ALPHA` | `true` | WebGL alpha channel |
| `AVATAR_RENDERER_POWER_PREFERENCE` | `'high-performance'` | WebGL power preference |
| `AVATAR_DPR_MIN` | `1` | Min device pixel ratio |
| `AVATAR_DPR_MAX` | `2` | Max device pixel ratio |

### 4. Local Speech Server Configuration

Controls the local WebSocket-based speech server.

| Environment Variable | Type | Default | Description |
|-----------------|------|-----------|-------------|
| `LOCAL_SPEECH_SERVER_URL` | `'ws://localhost:8765/ws'` | WebSocket server URL |
| `LOCAL_SPEECH_SERVER_CORS_ORIGINS` | `["*"]` | CORS allowed origins |
| `LOCAL_TTS_VOICE` | `'af_heart'` | Default TTS voice |
| `LOCAL_TTS_LANG_CODE` | `'a'` | TTS language code |
| `LOCAL_TTS_DEVICE` | `'cuda'` | TTS compute device |
| `LOCAL_TTS_SAMPLE_RATE` | `24000` | TTS sample rate (Hz) |
| `LOCAL_STT_MODEL_SIZE` | `'base.en'` | STT model size |
| `LOCAL_STT_DEVICE` | `'cuda'` | STT compute device |
| `LOCAL_STT_COMPUTE_TYPE` | `'float16'` | STT compute type |
| `LOCAL_STT_LANGUAGE` | `'en'` | STT language |
| `LOCAL_STT_BEAM_SIZE` | `5` | STT beam search size |
| `LOCAL_STT_SILENCE_THRESHOLD` | `0.01` | Silence detection RMS threshold |
| `LOCAL_STT_SILENCE_DURATION` | `1.5` | Silence duration before auto-stop (s) |
| `LOCAL_STT_AUDIO_FORMAT` | `'webm-opus'` | Audio format sent to server |
| `LOCAL_FFMPEG_SAMPLE_RATE` | `16000` | FFmpeg sample rate (Hz) |
| `LOCAL_FFMPEG_CHANNELS` | `1` | FFmpeg audio channels |
| `LOCAL_FFMPEG_DECODE_TIMEOUT` | `10` | FFmpeg decode timeout (s) |
| `LOCAL_FFMPEG_RMS_TIMEOUT` | `5` | FFmpeg RMS timeout (s) |

## Programmatic Usage

### Getting Configuration

```typescript
import { getConfig } from '@atlas.agents/config';

// Get the singleton configuration instance
const config = getConfig();

// Access specific configuration sections
const ttsConfig = config.tts;
const sttConfig = config.stt;
const avatarConfig = config.avatar;
const localSpeechServerConfig = config.localSpeechServer;
```

### Getting Provider-Specific Configuration

```typescript
// Get TTS configuration for a specific provider
const edgeTTSConfig = config.getTTSConfig('edge-tts');
const webSpeechTTSConfig = config.getTTSConfig('web-speech');
const localTTSConfig = config.getTTSConfig('local');

// Get STT configuration for a specific provider
const webSpeechSTTConfig = config.getSTTConfig('web-speech');
const whisperSTTConfig = config.getSTTConfig('whisper');
const localSTTConfig = config.getSTTConfig('local');

// Get Whisper API configuration
const whisperAPIConfig = config.getWhisperConfig('your-api-key');
```

### Getting Avatar Configuration

```typescript
// Get animation duration for a specific animation
const duration = config.getAnimationDuration('greeting');

// Get viseme to blend shape mapping
const visemeMapping = config.getVisemeMapping('standard');
```

### Getting Server Configuration

```typescript
// Get server configuration
const serverConfig = config.getServerConfig('0.0.0.0', 8765);

// Get TTS server configuration
const ttsServerConfig = config.getTTSServerConfig();

// Get STT server configuration
const sttServerConfig = config.getSTTServerConfig();
```

### Loading Configuration from Environment Variables

```typescript
import { loadConfigFromEnv } from '@atlas.agents/config';

// Load all configuration from environment variables
const config = loadConfigFromEnv();
```

### Creating Custom Configuration

```typescript
import { AtlasConfig } from '@atlas.agents/config';

// Create a custom configuration instance
const customConfig = AtlasConfig.create({
  tts: {
    defaultVoice: 'custom-voice',
    durationMultiplier: 0.2,
  },
  stt: {
    sampleRate: 48000,
  },
  avatar: {
    targetHeight: 1.8,
  },
});

// Use the custom configuration
const service = new TTSService(customConfig.tts);
```

## Environment Variables Reference

### Node.js / Browser

All environment variables are prefixed with their category:

- `TTS_*` - Text-to-speech configuration
- `STT_*` - Speech-to-text configuration
- `WHISPER_*` - Whisper API configuration
- `AVATAR_*` - Avatar configuration
- `LOCAL_SPEECH_SERVER_*` - Local speech server configuration
- `LOCAL_TTS_*` - Local TTS server configuration
- `LOCAL_STT_*` - Local STT server configuration
- `LOCAL_FFMPEG_*` - FFmpeg configuration

### Python (Local Speech Server)

The Python server uses `pydantic_settings` with `SPEECH_` prefix:

```bash
# Server configuration
export SPEECH_HOST=127.0.0.1
export SPEECH_PORT=8765

# TTS configuration
export SPEECH_TTS_VOICE=af_heart
export SPEECH_TTS_LANG_CODE=a
export SPEECH_TTS_DEVICE=cuda
export SPEECH_TTS_SAMPLE_RATE=24000

# STT configuration
export SPEECH_STT_MODEL_SIZE=base.en
export SPEECH_STT_DEVICE=cuda
export SPEECH_STT_COMPUTE_TYPE=float16
export SPEECH_STT_LANGUAGE=en
export SPEECH_STT_BEAM_SIZE=5
export SPEECH_STT_SILENCE_THRESHOLD=0.01
export SPEECH_STT_SILENCE_DURATION=1.5

# CORS configuration (comma-separated)
export SPEECH_CORS_ORIGINS='["http://localhost:3000","https://example.com"]'
```

## Security Considerations

### CORS Origins

By default, the local speech server allows all origins (`["*"]`). In production, you should restrict this:

```bash
export SPEECH_CORS_ORIGINS='["https://yourdomain.com"]'
```

### API Keys

Never commit API keys to version control. Use environment variables:

```bash
export WHISPER_API_KEY=your-api-key-here
```

## Provider-Specific Details

### Edge TTS

- **Provider**: `edge-tts`
- **Default Voice**: `en-GB-LibbyNeural`
- **Supported Voices**: See [Edge TTS documentation](https://github.com/rany2/edge-tts)

### Web Speech API

- **Provider**: Browser's native Web Speech API
- **Default Language**: `en-US`
- **Fallback**: Automatically falls back if not supported

### Whisper (Groq API)

- **Provider**: Groq's Whisper API
- **Default Model**: `whisper-large-v3`
- **Default Endpoint**: `https://api.groq.com/openai/v1/audio/transcriptions`
- **API Key Required**: Yes (via `WHISPER_API_KEY`)

### Kokoro TTS (Local Server)

- **Provider**: Kokoro TTS
- **Default Voice**: `af_heart`
- **Default Sample Rate**: 24000 Hz
- **Default Device**: `cuda`

### Faster-Whisper (Local Server)

- **Provider**: Faster-Whisper
- **Default Model**: `base.en`
- **Default Device**: `cuda`
- **Default Compute Type**: `float16`

## Migration Guide

### From Hardcoded Values to Configuration

**Before:**
```typescript
const DEFAULT_VOICE = 'en-GB-LibbyNeural';
const BUFFER_DELAY = 150;
```

**After:**
```typescript
const config = getConfig();
const voice = config.tts.defaultVoice;
const bufferDelay = config.tts.bufferDelayMs;
```

### Adding Environment Variables

Add to your `.env` file or deployment configuration:

```bash
# .env
TTS_VOICE=en-US-AriaNeural
TTS_DURATION_MULTIPLIER=0.2
AVATAR_TARGET_HEIGHT=1.8
WHISPER_API_KEY=gsk_your_key_here
LOCAL_SPEECH_SERVER_CORS_ORIGINS='["https://yourapp.com"]'
```

### Loading Configuration in Different Environments

```typescript
// Development - use defaults
import { getConfig } from '@atlas.agents/config';

// Production - load from environment
import { loadConfigFromEnv } from '@atlas.agents/config';

const config = process.env.NODE_ENV === 'production'
  ? loadConfigFromEnv()
  : getConfig();
```

## API Reference

### AtlasConfig Class

The main configuration class with singleton pattern.

#### Methods

- `getInstance(config?)` - Get or create singleton instance
- `create(config)` - Create new instance (useful for testing)
- `tts` - Get TTS configuration
- `getTTSConfig(provider)` - Get provider-specific TTS config
- `stt` - Get STT configuration
- `getSTTConfig(provider)` - Get provider-specific STT config
- `getWhisperConfig(apiKey)` - Get Whisper API configuration
- `avatar` - Get avatar configuration
- `getAnimationDuration(name)` - Get animation duration
- `getVisemeMapping(type)` - Get viseme mapping
- `localSpeechServer` - Get local server config
- `getServerConfig(host?, port?)` - Get server config
- `getTTSServerConfig()` - Get TTS server config
- `getSTTServerConfig()` - Get STT server config

### loadConfigFromEnv()

Load configuration from environment variables. Automatically called by the `loadConfigFromEnv()` function.

### resetConfig()

Reset the singleton instance (useful for testing).

## Testing

### Mocking Configuration

```typescript
import { AtlasConfig, resetConfig } from '@atlas.agents/config';

beforeEach(() => {
  resetConfig();
});

test('should use custom voice', () => {
  const config = AtlasConfig.create({
    tts: { defaultVoice: 'test-voice' }
  });
  expect(config.tts.defaultVoice).toBe('test-voice');
});
```

## Troubleshooting

### Configuration Not Loading

If configuration changes aren't being applied:

1. Check that the config package is installed
2. Verify the import path is correct
3. Ensure `loadConfigFromEnv()` is called before services initialize
4. Check environment variable names match the prefix

### TypeScript Errors

If you see type errors related to the config:

1. Ensure `@atlas.agents/config` is in your `package.json`
2. Run `npm install` to ensure dependencies are installed
3. Check that the config module is properly exported

### Python Server Issues

If the Python server isn't using environment variables:

1. Verify `.env` file exists
2. Check that `pydantic_settings` is configured
3. Ensure `SPEECH_` prefix is used
4. Restart the server after changing environment variables

## Best Practices

1. **Use Environment Variables in Production**: Never hardcode API keys or URLs in production code
2. **Document Custom Values**: If you need non-default values, document them in your README
3. **Type Safety**: The config package provides TypeScript types for all configuration values
4. **Singleton Pattern**: Use `getConfig()` to get the shared instance, not create new instances
5. **Provider Abstraction**: Use `getTTSConfig()` and `getSTTConfig()` for provider-specific settings
6. **Security**: Always restrict CORS origins in production
7. **Testing**: Use `AtlasConfig.create()` for test-specific configurations

## License

MIT
