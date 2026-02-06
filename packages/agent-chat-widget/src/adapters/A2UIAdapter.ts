import type { ProtocolAdapter, AgentMessage, A2UIMessage } from '@atlas-agents/types';
import { createAgentMessage, getTextContent } from '@atlas-agents/types';

/**
 * A2UI (Agent-to-UI) Protocol Adapter
 * Converts between AgentMessage and A2UI surface/component model
 */
export class A2UIAdapter implements ProtocolAdapter<A2UIMessage, A2UIMessage> {
  readonly protocol = 'a2ui';

  fromProtocol(message: A2UIMessage): AgentMessage {
    const text = message.components
      ?.map(c => JSON.stringify(c))
      .join('\n') ?? '';

    return createAgentMessage('assistant', text, {
      protocolMeta: {
        a2ui: {
          type: message.type,
          surfaceId: message.surfaceId,
          components: message.components,
        }
      }
    });
  }

  toProtocol(message: AgentMessage): A2UIMessage {
    const text = getTextContent(message);
    return {
      type: 'updateComponents',
      surfaceId: message.contextId ?? 'default',
      components: [{
        type: 'text',
        props: { content: text, role: message.role }
      }]
    };
  }

  fromHistory(messages: A2UIMessage[]): AgentMessage[] {
    return messages.map(m => this.fromProtocol(m));
  }

  toHistory(messages: AgentMessage[]): A2UIMessage[] {
    return messages.map(m => this.toProtocol(m));
  }
}
