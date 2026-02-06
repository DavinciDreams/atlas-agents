import {
  createEventBus,
  type EventBus,
  type WidgetEvents,
  type Message,
  type ChatMessage,
} from '@atlas.agents/types';
import { AIService, type AIConfig } from './AIService';

let _idCounter = 0;
function generateId(): string {
  return `msg_${Date.now()}_${++_idCounter}`;
}

export class ChatOrchestrator {
  private eventBus: EventBus<WidgetEvents>;
  private aiService: AIService;
  private messages: Message[] = [];
  private maxMessages: number;

  constructor(aiConfig: AIConfig, maxMessages = 10) {
    this.eventBus = createEventBus<WidgetEvents>();
    this.aiService = new AIService(aiConfig);
    this.maxMessages = maxMessages;
  }

  async handleUserMessage(text: string): Promise<string> {
    // Add user message
    this.addMessage({ role: 'user', content: text });
    this.eventBus.emit('widget:ai-response-start', { userMessage: text });

    // Build chat history
    const history: ChatMessage[] = this.messages.map(m => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content
    }));

    // Get AI response
    const result = await this.aiService.getResponse(text, history);

    if (result.content) {
      this.addMessage({ role: 'assistant', content: result.content });
      this.eventBus.emit('widget:ai-response-complete', { fullText: result.content });
    }

    return result.content;
  }

  async handleUserMessageStreaming(
    text: string,
    onChunk: (content: string, fullText: string) => void
  ): Promise<string> {
    this.addMessage({ role: 'user', content: text });
    this.eventBus.emit('widget:ai-response-start', { userMessage: text });

    const history: ChatMessage[] = this.messages.map(m => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content
    }));

    // Create placeholder message
    const messageId = generateId();
    let fullText = '';
    this.messages.push({
      id: messageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now()
    });

    await this.aiService.streamResponse(text, history, {
      onChunk: (chunk) => {
        if (chunk.isComplete) {
          this.eventBus.emit('widget:ai-response-complete', { fullText });
          return;
        }
        if (chunk.content) {
          fullText += chunk.content;
          // Update the message in-place
          const msg = this.messages.find(m => m.id === messageId);
          if (msg) msg.content = fullText;

          this.eventBus.emit('widget:ai-response-chunk', { content: chunk.content, isComplete: false });
          onChunk(chunk.content, fullText);
        }
      },
      onError: (error) => {
        this.eventBus.emit('widget:ai-response-error', { error });
      }
    });

    return fullText;
  }

  private addMessage(msg: { role: string; content: string }): Message {
    const message: Message = {
      id: generateId(),
      role: msg.role as Message['role'],
      content: msg.content,
      timestamp: Date.now()
    };
    this.messages.push(message);
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages);
    }
    return message;
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  clearMessages(): void {
    this.messages = [];
  }

  on<K extends keyof WidgetEvents>(event: K, handler: (data: WidgetEvents[K]) => void): () => void {
    return this.eventBus.on(event, handler);
  }

  dispose(): void {
    this.eventBus.removeAllListeners();
  }
}
