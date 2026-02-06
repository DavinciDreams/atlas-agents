import React, { useState, useCallback } from 'react';
import { AgentChatWidget } from '@atlas.agents/agent-chat-widget';
import { GAME_AGENTS, type GameAgent } from './agents';

/**
 * Agents of Empires - Multi-Agent Game Demo
 *
 * Demonstrates how to integrate atlas-agents packages into a game:
 * - Multiple AI agents with unique personalities and voices
 * - Click an agent card to open their chat window
 * - Each agent runs independently with its own STT/TTS/AI
 * - Supports opening agents in new windows for multi-monitor setups
 */

const FACTION_COLORS: Record<string, string> = {
  roman: '#c9302c',
  egyptian: '#d4a017',
  norse: '#2e7d32',
  eastern: '#7b1fa2',
};

const FACTION_LABELS: Record<string, string> = {
  roman: 'Roman Empire',
  egyptian: 'Egyptian Kingdom',
  norse: 'Norse Clans',
  eastern: 'Eastern Dynasty',
};

export const App: React.FC = () => {
  const [activeAgent, setActiveAgent] = useState<GameAgent | null>(null);
  const [chatLog, setChatLog] = useState<Array<{ agentId: string; text: string }>>([]);

  const handleAgentClick = useCallback((agent: GameAgent) => {
    setActiveAgent(agent);
  }, []);

  const handleOpenInWindow = useCallback((agent: GameAgent) => {
    const win = window.open('', `agent-${agent.id}`, 'width=800,height=600');
    if (!win) {
      alert('Popup blocked. Please allow popups for this site.');
      return;
    }
    // Write a minimal page that loads the widget
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Chat with ${agent.name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { background: #0a0a0a; color: #fff; font-family: system-ui, sans-serif; }
            #root { height: 100vh; }
          </style>
        </head>
        <body>
          <div id="root">
            <div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#888;">
              <p>To use this feature, build the app and serve the widget bundle.<br/>
              See the AgentChatWidget docs for window.open() integration.</p>
            </div>
          </div>
        </body>
      </html>
    `);
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Left Panel: Agent Selection */}
      <div style={{
        width: 320,
        background: '#16213e',
        borderRight: '1px solid #0f3460',
        overflow: 'auto',
        padding: 16,
      }}>
        <h1 style={{
          fontSize: 20,
          fontWeight: 700,
          marginBottom: 8,
          color: '#e94560',
          letterSpacing: 1,
        }}>
          Agents of Empires
        </h1>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
          Click an agent to start a conversation. Each has a unique personality, voice, and avatar.
        </p>

        {GAME_AGENTS.map((agent) => (
          <div
            key={agent.id}
            onClick={() => handleAgentClick(agent)}
            style={{
              padding: 14,
              marginBottom: 10,
              borderRadius: 8,
              border: `2px solid ${activeAgent?.id === agent.id ? FACTION_COLORS[agent.faction] : '#1a1a2e'}`,
              background: activeAgent?.id === agent.id ? '#1a1a3e' : '#0f3460',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: FACTION_COLORS[agent.faction],
                }}>
                  {agent.name}
                </div>
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>
                  {agent.role} — {FACTION_LABELS[agent.faction]}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenInWindow(agent);
                }}
                style={{
                  background: 'none',
                  border: '1px solid #555',
                  color: '#aaa',
                  borderRadius: 4,
                  padding: '4px 8px',
                  fontSize: 11,
                  cursor: 'pointer',
                }}
                title="Open in new window"
              >
                Pop Out
              </button>
            </div>
            <div style={{ fontSize: 12, color: '#777', marginTop: 6 }}>
              {agent.description}
            </div>
          </div>
        ))}

        {/* Game Event Log */}
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 13, color: '#555', marginBottom: 8 }}>Game Event Log</h3>
          <div style={{
            fontSize: 11,
            color: '#555',
            maxHeight: 200,
            overflow: 'auto',
          }}>
            {chatLog.length === 0 ? (
              <div>No events yet. Talk to an agent!</div>
            ) : (
              chatLog.map((entry, i) => (
                <div key={i} style={{ marginBottom: 4 }}>
                  <span style={{ color: '#e94560' }}>[{entry.agentId}]</span> {entry.text}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Panel: Active Agent Chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {activeAgent ? (
          <>
            {/* Agent Header */}
            <div style={{
              padding: '12px 20px',
              background: '#16213e',
              borderBottom: `2px solid ${FACTION_COLORS[activeAgent.faction]}`,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <div style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: FACTION_COLORS[activeAgent.faction],
              }} />
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{activeAgent.name}</div>
                <div style={{ fontSize: 12, color: '#888' }}>
                  {activeAgent.role} — {FACTION_LABELS[activeAgent.faction]}
                </div>
              </div>
            </div>

            {/* Chat Widget */}
            <div style={{ flex: 1 }}>
              <AgentChatWidget
                key={activeAgent.id}
                config={activeAgent.widgetConfig}
                onMessage={(msg) => {
                  setChatLog(prev => [
                    ...prev.slice(-50),
                    { agentId: activeAgent.name, text: msg.content.slice(0, 80) + '...' },
                  ]);
                }}
                onAnimationTrigger={(animations) => {
                  setChatLog(prev => [
                    ...prev.slice(-50),
                    { agentId: activeAgent.name, text: `[animation: ${animations.map(a => a.name).join(', ')}]` },
                  ]);
                }}
                style={{ height: '100%' }}
              />
            </div>
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#444',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>&#x2694;&#xFE0F;</div>
              <div style={{ fontSize: 18, marginBottom: 8 }}>Select an Agent</div>
              <div style={{ fontSize: 13, maxWidth: 300 }}>
                Click an agent from the panel on the left to start a conversation.
                Each agent has their own personality, voice, and knowledge.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
