import React, { useState, useRef } from 'react';
import { AgentChatWidget } from '@atlas-agents/agent-chat-widget';
import { AvatarModel, type AvatarModelRef } from '@atlas-agents/avatar-react';

/**
 * Basic Chat Example
 *
 * Demonstrates the full agent chat widget with:
 * - 3D VRM avatar with animations
 * - Chat interface with streaming AI responses
 * - Speech-to-text (microphone input)
 * - Text-to-speech (Edge TTS or Web Speech fallback)
 * - LLM-based animation judgment
 *
 * To use AI features, set your API key below or via environment variable.
 */
export const App: React.FC = () => {
  const [currentAnimation, setCurrentAnimation] = useState<string>('modelPose');
  const avatarRef = useRef<AvatarModelRef>(null);

  // Configure your API key here or via VITE_OPENROUTER_API_KEY env var
  const apiKey = (import.meta as any).env?.VITE_OPENROUTER_API_KEY ?? '';

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0a0a0a' }}>
      {/* Left: 3D Avatar */}
      <div style={{ flex: 1, position: 'relative' }}>
        <AvatarModel
          ref={avatarRef}
          modelUrl="/model/robot.vrm"
          currentAnimation={currentAnimation}
          animationSpeed={1.0}
          animationBasePath="/animations/"
          enableOrbitControls
          enableShadows
          onModelLoaded={(vrm) => {
            console.log('Avatar loaded:', vrm);
          }}
          onAnimationStart={(name) => {
            console.log('Animation started:', name);
          }}
          onAnimationEnd={(name) => {
            console.log('Animation ended:', name);
            setCurrentAnimation('modelPose');
          }}
        />
      </div>

      {/* Right: Chat Widget */}
      <div style={{ width: 400, borderLeft: '1px solid #222' }}>
        <AgentChatWidget
          config={{
            agentId: 'demo-agent',
            avatar: {
              modelUrl: '/model/robot.vrm',
              defaultAnimation: 'modelPose',
              animationBasePath: '/animations/',
            },
            ai: {
              provider: 'openrouter',
              apiKey,
              model: 'openai/gpt-4.1-mini',
              systemPrompt: `You are a friendly and expressive AI assistant with a 3D avatar.
Keep responses concise (2-3 sentences). Be enthusiastic and engaging.`,
            },
            speech: {
              tts: {
                provider: 'edge-tts',
                voice: 'en-US-AriaNeural',
              },
              stt: {
                provider: 'web-speech',
              },
            },
            theme: 'dark',
          }}
          onMessage={(msg) => {
            console.log('Message:', msg);
          }}
          onAnimationTrigger={(animations) => {
            console.log('Animations triggered:', animations);
            if (animations.length > 0) {
              setCurrentAnimation(animations[0].name);
            }
          }}
          style={{ height: '100%' }}
        />
      </div>
    </div>
  );
};
