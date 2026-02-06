import type { AnimationJudgment, AnimationTrigger } from '@atlas-agents/types';

export interface AnimationJudgeConfig {
  apiKey?: string;
  apiUrl?: string;
  model?: string;
  availableAnimations?: string[];
  systemPrompt?: string;
  toolDefinition?: Record<string, unknown>;
}

const DEFAULT_ANIMATIONS = [
  'greeting', 'peace', 'shoot', 'spin', 'modelPose', 'squat',
  'idle', 'weightShift', 'sadIdle', 'acknowledging',
  'bowing', 'salute', 'singing', 'waving', 'yelling',
  'hipHopDancing', 'swinging', 'rumbaDancing', 'sambaDancing',
  'punch', 'dropKick', 'walking', 'jumping', 'climbing',
  'headNod', 'shakingHeadNo', 'happyHandGesture', 'thumbsUp', 'thumbsDown',
  'thinking', 'angryGesture', 'dismissingGesture', 'pointing',
];

const DEFAULT_PROMPT = `You are an animation judge for a 3D avatar. Based on the conversation, choose appropriate animations. Be concise.`;

export class AnimationJudge {
  private config: Required<Pick<AnimationJudgeConfig, 'apiUrl' | 'model' | 'availableAnimations' | 'systemPrompt'>> & Pick<AnimationJudgeConfig, 'apiKey' | 'toolDefinition'>;
  private cache = new Map<string, AnimationJudgment>();

  constructor(config: AnimationJudgeConfig = {}) {
    this.config = {
      apiKey: config.apiKey,
      apiUrl: config.apiUrl ?? 'https://openrouter.ai/api/v1/chat/completions',
      model: config.model ?? 'openai/gpt-4o-mini',
      availableAnimations: config.availableAnimations ?? DEFAULT_ANIMATIONS,
      systemPrompt: config.systemPrompt ?? DEFAULT_PROMPT,
      toolDefinition: config.toolDefinition,
    };
  }

  async judge(userMessage: string, aiResponse: string): Promise<AnimationJudgment> {
    const cacheKey = `${userMessage}::${aiResponse}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    if (!this.config.apiKey) {
      return { animations: [], reasoning: 'No API key configured for animation judge' };
    }

    try {
      const toolDef = this.config.toolDefinition ?? {
        type: 'function',
        function: {
          name: 'trigger_animations',
          description: 'Trigger avatar animations based on conversation context',
          parameters: {
            type: 'object',
            properties: {
              animations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', enum: this.config.availableAnimations },
                    delay: { type: 'number' }
                  },
                  required: ['name']
                }
              },
              reasoning: { type: 'string' }
            },
            required: ['animations', 'reasoning']
          }
        }
      };

      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: this.config.systemPrompt },
            { role: 'user', content: `User said: "${userMessage}"\n\nAI responded: "${aiResponse}"\n\nWhat animations should the avatar perform?` }
          ],
          tools: [toolDef],
          tool_choice: { type: 'function', function: { name: 'trigger_animations' } }
        })
      });

      if (!response.ok) {
        throw new Error(`Judge API error: ${response.status}`);
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

      if (!toolCall) {
        return { animations: [], reasoning: 'No tool call in response' };
      }

      const args = JSON.parse(toolCall.function.arguments);

      // Validate animation names with fuzzy matching
      const validAnimations: AnimationTrigger[] = (args.animations || [])
        .map((a: AnimationTrigger) => {
          const matched = this.findClosestAnimation(a.name);
          return matched ? { name: matched, delay: a.delay ?? 0 } : null;
        })
        .filter(Boolean) as AnimationTrigger[];

      const judgment: AnimationJudgment = {
        animations: validAnimations,
        reasoning: args.reasoning || 'No reasoning provided'
      };

      this.cache.set(cacheKey, judgment);
      return judgment;
    } catch (error) {
      console.error('Animation judge error:', error);
      return { animations: [], reasoning: `Error: ${(error as Error).message}` };
    }
  }

  private findClosestAnimation(name: string): string | null {
    const animations = this.config.availableAnimations;

    // Exact match
    if (animations.includes(name)) return name;

    // Case-insensitive
    const caseMatch = animations.find(a => a.toLowerCase() === name.toLowerCase());
    if (caseMatch) return caseMatch;

    // Fuzzy match
    const normalized = name.toLowerCase().replace(/ing$/, '').replace(/s$/, '');
    const fuzzy = animations.find(a => {
      const n = a.toLowerCase().replace(/ing$/, '').replace(/s$/, '');
      return n === normalized || n.includes(normalized) || normalized.includes(n);
    });

    return fuzzy ?? null;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
