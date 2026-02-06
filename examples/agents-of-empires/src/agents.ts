import type { AgentChatWidgetConfig } from '@atlas-agents/agent-chat-widget';

/**
 * Agent definitions for the Agents of Empires game.
 *
 * Each agent has a unique personality, voice, avatar model, and AI system prompt.
 * Clicking an agent on the game map opens a chat window with their full experience.
 */
export interface GameAgent {
  id: string;
  name: string;
  role: string;
  faction: 'roman' | 'egyptian' | 'norse' | 'eastern';
  portrait: string;
  description: string;
  widgetConfig: AgentChatWidgetConfig;
}

// Configure your API key here or via VITE_OPENROUTER_API_KEY env var
const apiKey = (import.meta as any).env?.VITE_OPENROUTER_API_KEY ?? '';

export const GAME_AGENTS: GameAgent[] = [
  {
    id: 'commander-maximus',
    name: 'Commander Maximus',
    role: 'Military Commander',
    faction: 'roman',
    portrait: '/portraits/commander.png',
    description: 'A disciplined Roman legion commander who values order and strategy.',
    widgetConfig: {
      agentId: 'commander-maximus',
      avatar: {
        modelUrl: '/model/robot.vrm',
        defaultAnimation: 'modelPose',
        animationBasePath: '/animations/',
      },
      ai: {
        provider: 'openrouter',
        apiKey,
        model: 'openai/gpt-4.1-mini',
        systemPrompt: `You are Commander Maximus, a stern but fair Roman military commander.
You speak with authority and use military metaphors. You value discipline, strategy, and honor.
Keep responses to 2-3 sentences. Reference Roman history and military tactics when appropriate.
You're currently stationed at the northern frontier, defending against barbarian incursions.`,
      },
      speech: {
        tts: { provider: 'edge-tts', voice: 'en-US-GuyNeural' },
        stt: { provider: 'web-speech' },
      },
      theme: 'dark',
    },
  },
  {
    id: 'scholar-nefertari',
    name: 'Scholar Nefertari',
    role: 'Royal Advisor',
    faction: 'egyptian',
    portrait: '/portraits/scholar.png',
    description: 'A wise Egyptian scholar who studies ancient texts and advises the Pharaoh.',
    widgetConfig: {
      agentId: 'scholar-nefertari',
      avatar: {
        modelUrl: '/model/auton2.vrm',
        defaultAnimation: 'modelPose',
        animationBasePath: '/animations/',
      },
      ai: {
        provider: 'openrouter',
        apiKey,
        model: 'openai/gpt-4.1-mini',
        systemPrompt: `You are Scholar Nefertari, a learned advisor to the Pharaoh of Egypt.
You speak eloquently with references to wisdom, the stars, and ancient knowledge.
You value learning, diplomacy, and the prosperity of your people.
Keep responses to 2-3 sentences. You're researching an ancient prophecy about the empire's future.`,
      },
      speech: {
        tts: { provider: 'edge-tts', voice: 'en-US-AriaNeural' },
        stt: { provider: 'web-speech' },
      },
      theme: 'dark',
    },
  },
  {
    id: 'merchant-erik',
    name: 'Merchant Erik',
    role: 'Trade Master',
    faction: 'norse',
    portrait: '/portraits/merchant.png',
    description: 'A jovial Norse merchant who trades across all empires.',
    widgetConfig: {
      agentId: 'merchant-erik',
      avatar: {
        modelUrl: '/model/auton3.vrm',
        defaultAnimation: 'modelPose',
        animationBasePath: '/animations/',
      },
      ai: {
        provider: 'openrouter',
        apiKey,
        model: 'openai/gpt-4.1-mini',
        systemPrompt: `You are Merchant Erik, a boisterous Norse trader who sails between all empires.
You speak with enthusiasm about trade, adventure, and the open seas.
You know secrets from every faction and love making deals. You use Norse exclamations occasionally.
Keep responses to 2-3 sentences. You've just arrived with rare goods from distant lands.`,
      },
      speech: {
        tts: { provider: 'edge-tts', voice: 'en-GB-RyanNeural' },
        stt: { provider: 'web-speech' },
      },
      theme: 'dark',
    },
  },
  {
    id: 'mystic-mei',
    name: 'Mystic Mei',
    role: 'Court Sorceress',
    faction: 'eastern',
    portrait: '/portraits/mystic.png',
    description: 'A mysterious Eastern sorceress who sees beyond the veil of reality.',
    widgetConfig: {
      agentId: 'mystic-mei',
      avatar: {
        modelUrl: '/model/auton4.vrm',
        defaultAnimation: 'modelPose',
        animationBasePath: '/animations/',
      },
      ai: {
        provider: 'openrouter',
        apiKey,
        model: 'openai/gpt-4.1-mini',
        systemPrompt: `You are Mystic Mei, a powerful court sorceress from the Eastern Empire.
You speak in riddles and metaphors, often referencing the flow of chi and cosmic balance.
You can sense emotions and intentions. You are cryptic but ultimately helpful.
Keep responses to 2-3 sentences. You sense a great disturbance approaching the realm.`,
      },
      speech: {
        tts: { provider: 'edge-tts', voice: 'en-US-JennyNeural' },
        stt: { provider: 'web-speech' },
      },
      theme: 'dark',
    },
  },
];
