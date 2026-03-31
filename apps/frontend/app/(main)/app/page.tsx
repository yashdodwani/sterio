'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSessionStore } from '@/lib/session-store';
import { ChatShell } from '@/components/chat/ChatShell';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import type { ChatMessage, MessagePart } from '@/lib/chat/types';
import type { components } from '@/src/types/api.d';
import { getChatSession, useInvalidateSessions } from '@/lib/api/sessions';

type BackendMessage = components['schemas']['ChatMessage'];
type RawPart = Record<string, unknown>;

function toInitialMessages(messages: BackendMessage[]): ChatMessage[] {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => {
      const role = m.role as 'user' | 'assistant';
      const rawParts = Array.isArray(m.parts) ? (m.parts as RawPart[]) : [];

      if (role === 'user') {
        const text = rawParts
          .filter((p) => p.type === 'text' && typeof p.text === 'string')
          .map((p) => p.text as string)
          .join('');
        return { id: m.id, role, parts: [{ type: 'text' as const, text }] };
      }

      // assistant: convert tool-{toolName} and text parts; skip step-start/steart
      const parts: MessagePart[] = rawParts.flatMap((p): MessagePart[] => {
        if (p.type === 'text' && typeof p.text === 'string') {
          return [{ type: 'text', text: p.text }];
        }
        if (typeof p.type === 'string' && p.type.startsWith('tool-') && p.toolCallId) {
          const toolName = p.type.slice('tool-'.length);
          return [{ type: 'tool-result', toolCallId: String(p.toolCallId), toolName, result: p.output }];
        }
        return [];
      });

      return { id: m.id, role, parts };
    });
}

type SessionState = {
  sessionId: string | null;
  initialMessages: ChatMessage[];
};

export default function ChatPage() {
  const { _hasHydrated, sessionId, setSessionId, clearSession } = useSessionStore();
  const [session, setSession] = useState<SessionState | null>(null);
  const [chatKey, setChatKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const invalidateSessions = useInvalidateSessions();

  const loadSession = useCallback(async (sid: string): Promise<ChatMessage[] | null> => {
    try {
      const data = await getChatSession(sid);
      return toInitialMessages(data.messages);
    } catch {
      return null;
    }
  }, []);

  // On mount: resume stored session or show empty state — never eagerly create
  useEffect(() => {
    if (!_hasHydrated) return;

    async function init() {
      const sid = sessionId;
      if (!sid) {
        setSession({ sessionId: null, initialMessages: [] });
        return;
      }
      const msgs = await loadSession(sid);
      if (msgs === null) {
        // Session not found (e.g. different user) — reset to empty state
        clearSession();
        setSession({ sessionId: null, initialMessages: [] });
      } else {
        setSession({ sessionId: sid, initialMessages: msgs });
      }
    }

    init();
  }, [_hasHydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Called by useSSEChat when the backend assigns a session ID on first send
  const handleSessionCreated = useCallback(
    (newId: string) => {
      setSessionId(newId);
      setSession((prev) => (prev ? { ...prev, sessionId: newId } : prev));
      // Refresh sidebar after backend generates the session title
      setTimeout(invalidateSessions, 2000);
    },
    [setSessionId, invalidateSessions],
  );

  const handleSelectSession = useCallback(async (sid: string) => {
    if (sid === session?.sessionId) return;
    const msgs = await loadSession(sid);
    setSessionId(sid);
    setChatKey((k) => k + 1);
    setSession({ sessionId: sid, initialMessages: msgs ?? [] });
  }, [session?.sessionId, loadSession, setSessionId]);

  const resetToEmpty = useCallback(() => {
    clearSession();
    setChatKey((k) => k + 1);
    setSession({ sessionId: null, initialMessages: [] });
  }, [clearSession]);

  const handleNewChat = useCallback(() => {
    if (session?.sessionId === null) return; // already on empty state
    resetToEmpty();
  }, [session?.sessionId, resetToEmpty]);

  return (
    <div className="flex h-full overflow-hidden">
      <ChatSidebar
        activeSessionId={session?.sessionId ?? null}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onActiveSessionDeleted={resetToEmpty}
      />

      <div
        className="flex flex-col flex-1 min-w-0 relative"
        style={{
          backgroundImage: [
            'radial-gradient(ellipse 90% 65% at 65% 10%, rgba(91, 77, 244, 0.09) 0%, transparent 100%)',
            'radial-gradient(circle, rgba(255, 255, 255, 0.035) 1px, transparent 1px)',
          ].join(', '),
          backgroundSize: '100% 100%, 22px 22px',
        }}
      >
        {session && (
          <ChatShell
            key={chatKey}
            sessionId={session.sessionId}
            initialMessages={session.initialMessages}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen((o) => !o)}
            onNewChat={handleNewChat}
            onSessionCreated={handleSessionCreated}
          />
        )}
      </div>
    </div>
  );
}
