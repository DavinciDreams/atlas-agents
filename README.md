# Atlas Agents

Modular packages for building AI agent experiences with 3D avatars, chat, and speech. Extracted from [3dchat](https://github.com/DavinciDreams/3dchat) as standalone, composable npm packages.

## Packages

```
@atlas-agents/types              Shared types, EventBus, AgentMessage, protocol adapter interfaces
@atlas-agents/speech-stt         Web Speech API + Whisper (Groq) fallback
@atlas-agents/speech-tts         Edge TTS + browser fallback + viseme generation
@atlas-agents/avatar-core        Headless VRM loading, animations, lip sync (no React)
@atlas-agents/avatar-react       React component wrapping avatar-core (R3F)
@atlas-agents/chat-ui            Props-driven React chat interface
@atlas-agents/agent-chat-widget  Composed widget + AI + 6 protocol adapters
```

### Dependency Graph

```
types
 ├── speech-stt
 ├── speech-tts
 ├── avatar-core
 ├── chat-ui
 │
 └── avatar-react (avatar-core)
       │
       └── agent-chat-widget (all above)
```

## Quick Start

```bash
npm install
npm run build   # builds all 7 packages via turborepo
```

### Full Widget (one line)

```tsx
import { AgentChatWidget } from '@atlas-agents/agent-chat-widget';

<AgentChatWidget
  config={{
    agentId: 'my-agent',
    avatar: {
      modelUrl: '/model/robot.vrm',
      defaultAnimation: 'modelPose',
      animationBasePath: '/animations/',
    },
    ai: {
      provider: 'openrouter',
      apiKey: 'sk-or-...',
      model: 'openai/gpt-4.1-mini',
      systemPrompt: 'You are a helpful assistant.',
    },
    speech: {
      tts: { provider: 'edge-tts', voice: 'en-US-AriaNeural' },
      stt: { provider: 'web-speech' },
    },
    theme: 'dark',
  }}
  onMessage={(msg) => console.log(msg)}
  onAnimationTrigger={(anims) => console.log(anims)}
/>
```

### Individual Packages

Use packages independently for custom composition:

```typescript
import { STTService } from '@atlas-agents/speech-stt';
import { TTSService } from '@atlas-agents/speech-tts';

const stt = new STTService({ provider: 'web-speech' });
const tts = new TTSService({ provider: 'edge-tts', voice: 'en-US-GuyNeural' });

stt.on('stt:final-transcript', async ({ text }) => {
  const response = await myAIService.chat(text);
  tts.speak(response);
});

stt.start();
```

### 3D Avatar (React)

```tsx
import { AvatarModel } from '@atlas-agents/avatar-react';

<AvatarModel
  modelUrl="/model/robot.vrm"
  currentAnimation="greeting"
  animationSpeed={1.0}
  animationBasePath="/animations/"
  enableOrbitControls
  enableShadows
  onModelLoaded={(vrm) => console.log('Loaded', vrm)}
  onAnimationStart={(name) => console.log('Playing', name)}
  ref={avatarRef}
/>
```

### Chat UI (React)

```tsx
import { ChatContainer } from '@atlas-agents/chat-ui';

<ChatContainer
  messages={messages}
  isProcessing={false}
  isSpeaking={false}
  isListening={false}
  isMuted={false}
  currentAnimation="idle"
  onSendMessage={(text) => handleSend(text)}
  onMicToggle={() => toggleMic()}
  onStopSpeaking={() => stopTTS()}
  onMuteToggle={() => toggleMute()}
  onNewChat={() => clearChat()}
  theme="dark"
/>
```

### Headless Avatar Engine (no React)

```typescript
import { AvatarEngine } from '@atlas-agents/avatar-core';

const engine = new AvatarEngine({ animationBasePath: '/animations/' });
await engine.loadModel('/model/robot.vrm');

engine.playAnimation('greeting');
engine.applyViseme('aa', 1.0);
engine.on('avatar:animation-started', ({ name }) => console.log(name));

// Call in your render loop
function animate(dt: number) {
  engine.update(dt);
  requestAnimationFrame(animate);
}
```

## Protocol Adapters

The widget includes bidirectional adapters for 6 agent protocols. Each implements `ProtocolAdapter<TIn, TOut>` with `fromProtocol` / `toProtocol` / `fromHistory` / `toHistory`.

| Adapter | Protocol | Format |
|---------|----------|--------|
| `A2AAdapter` | Google Agent-to-Agent | JSON-RPC 2.0, Tasks/Messages/Artifacts |
| `MCPAdapter` | Anthropic MCP | JSON-RPC 2.0, Tools/Resources/Prompts |
| `VercelAIAdapter` | Vercel AI SDK | SSE streaming, useChat, UIMessage |
| `LangChainAdapter` | LangChain/LangGraph | HumanMessage/AIMessage, /invoke /stream |
| `MSAgentAdapter` | Microsoft Agent Framework | ChatMessageContent, AgentChannel |
| `A2UIAdapter` | Agent-to-UI | createSurface/updateComponents |

```typescript
import { A2AAdapter, MCPAdapter } from '@atlas-agents/agent-chat-widget';
import { createAgentMessage } from '@atlas-agents/types';

const a2a = new A2AAdapter();
const mcp = new MCPAdapter();

// Convert A2A message to universal format, then to MCP
const universal = a2a.fromProtocol(inboundA2AMessage);
const mcpMessage = mcp.toProtocol(universal);
```

## Architecture

All inter-package communication flows through a typed `EventBus<T>` defined in `@atlas-agents/types`. No package directly imports another package's state.

```
User speaks -> [STT] emits 'stt:final-transcript'
  -> [Widget Orchestrator] calls AI -> emits 'widget:ai-response-chunk'
    -> [Chat UI] displays message
    -> [TTS] synthesizes audio -> emits 'tts:synthesis-complete' with visemes
      -> [Avatar Core] applies lip sync
    -> [Animation Judge] -> emits 'widget:animation-judgment'
      -> [Avatar Core] plays animations
```

Every package accepts API keys through constructor config. No `import.meta.env` references. No Zustand or global store dependencies (except agent-chat-widget's internal state).

## Examples

### basic-chat

Minimal integration: 3D avatar + chat widget side by side.

```bash
cd examples/basic-chat
npm run dev   # http://localhost:3100
```

### agents-of-empires

Multi-agent game demo with 4 faction agents, each with unique personality and voice. Click an agent card to open their chat.

```bash
cd examples/agents-of-empires
npm run dev   # http://localhost:3200
```

## Development

```bash
npm install          # install all workspace dependencies
npm run build        # build all packages (turborepo)
npm run dev          # watch mode for all packages
npm run test         # run tests
npm run clean        # remove all dist/ and node_modules/
```

### Adding a New Package

1. Create `packages/my-package/` with `package.json`, `vite.config.ts`, `tsconfig.json`, `src/index.ts`
2. Use `"@atlas-agents/types": "*"` for workspace dependencies (npm syntax, not pnpm)
3. Turborepo will automatically include it in the build pipeline via `^build`

## Build Output

Each package produces ES module + CommonJS bundles with TypeScript declarations using Vite library mode:

```
packages/*/dist/
  *.es.js       # ES module
  *.cjs.js      # CommonJS
  index.d.ts    # TypeScript declarations
```

## License

MIT
