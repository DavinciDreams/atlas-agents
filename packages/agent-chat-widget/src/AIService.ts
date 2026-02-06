import type { ChatMessage, AIStreamChunk, AIStreamOptions, AIStateChanges, Emotion } from '@atlas.agents/types';

export interface AIConfig {
  provider?: string;
  apiKey?: string;
  apiUrl?: string;
  model?: string;
  systemPrompt?: string;
}

export class AIService {
  private config: Required<AIConfig>;

  constructor(config: AIConfig = {}) {
    this.config = {
      provider: config.provider ?? 'openrouter',
      apiKey: config.apiKey ?? '',
      apiUrl: config.apiUrl ?? 'https://openrouter.ai/api/v1/chat/completions',
      model: config.model ?? 'openai/gpt-4.1-mini',
      systemPrompt: config.systemPrompt ?? 'You are a helpful assistant.',
    };
  }

  async getResponse(
    input: string,
    messages: ChatMessage[]
  ): Promise<{ content: string; stateChanges: AIStateChanges }> {
    try {
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
            ...messages,
            { role: 'user', content: input }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content ?? '';

      return {
        content: aiResponse,
        stateChanges: { isProcessing: false, emotion: 'happy' as Emotion }
      };
    } catch (error) {
      console.error('AI response error:', error);
      return {
        content: '',
        stateChanges: { isProcessing: false, emotion: 'neutral' as Emotion }
      };
    }
  }

  async streamResponse(
    input: string,
    messages: ChatMessage[],
    options: AIStreamOptions
  ): Promise<{ stateChanges: AIStateChanges }> {
    try {
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
            ...messages,
            { role: 'user', content: input }
          ],
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is not readable');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          options.onChunk({ content: '', isComplete: true });
          return { stateChanges: { isProcessing: false, emotion: 'happy' as Emotion } };
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              options.onChunk({ content: '', isComplete: true });
              return { stateChanges: { isProcessing: false, emotion: 'happy' as Emotion } };
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                options.onChunk({ content, isComplete: false });
              }
            } catch {
              // Skip unparseable SSE lines
            }
          }
        }
      }
    } catch (error) {
      console.error('AI stream error:', error);
      options.onError?.(error as Error);
      return { stateChanges: { isProcessing: false, emotion: 'neutral' as Emotion } };
    }
  }
}
