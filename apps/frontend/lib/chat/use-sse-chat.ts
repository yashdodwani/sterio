'use client';

import { useState, useCallback } from 'react';
import { parseSSEStream } from './sse-client';
import { createChatSession } from '@/lib/api/sessions';
import type { ChatMessage, MessagePart, SSEEvent } from './types';

const CHAT_URL = '/api/chat';

interface Options {
  sessionId: string | null;
  initialMessages?: ChatMessage[];
  onSessionCreated?: (sessionId: string) => void;
}

export function useSSEChat({ sessionId, initialMessages = [], onSessionCreated }: Options) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        parts: [{ type: 'text', text }],
      };
      const assistantId = crypto.randomUUID();
      const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', parts: [] };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);

      let accText = '';

      const updateAssistant = (updater: (parts: MessagePart[]) => MessagePart[]) => {
        setMessages((prev) => {
          const idx = prev.findLastIndex((m) => m.id === assistantId);
          if (idx === -1) return prev;
          return [
            ...prev.slice(0, idx),
            { ...prev[idx], parts: updater(prev[idx].parts) },
            ...prev.slice(idx + 1),
          ];
        });
      };

      setIsStreaming(true);

      try {
        let activeSessionId = sessionId;
        if (!activeSessionId) {
          const session = await createChatSession();
          activeSessionId = session.id;
          onSessionCreated?.(activeSessionId);
        }

        const res = await fetch(CHAT_URL, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [{ role: 'user', content: text }], sessionId: activeSessionId }),
        });

        if (!res.ok) {
          const errText = await res.text();
          updateAssistant(() => [{ type: 'text', text: `Error ${res.status}: ${errText}` }]);
          return;
        }

        await parseSSEStream(res.body!, (evt: SSEEvent) => {
          switch (evt.type) {
            case 'text-delta':
              accText += evt.delta;
              updateAssistant((parts) => {
                const last = parts[parts.length - 1];
                if (last?.type === 'text') {
                  return [...parts.slice(0, -1), { type: 'text', text: accText }];
                }
                return [...parts, { type: 'text', text: accText }];
              });
              break;

            case 'tool-call':
              updateAssistant((parts) => [
                ...parts,
                { type: 'tool-loading', toolCallId: evt.toolCallId, toolName: evt.toolName },
              ]);
              break;

            case 'tool-result':
              updateAssistant((parts) =>
                parts.map((p) =>
                  p.type === 'tool-loading' && p.toolCallId === evt.toolCallId
                    ? {
                        type: 'tool-result',
                        toolCallId: evt.toolCallId,
                        toolName: evt.toolName,
                        result: evt.result,
                      }
                    : p,
                ),
              );
              break;

            case 'error':
              updateAssistant((parts) => [
                ...parts,
                { type: 'text', text: `\n\n⚠️ ${evt.error}` },
              ]);
              break;
          }
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        updateAssistant((parts) => [...parts, { type: 'text', text: `\n\n⚠️ ${msg}` }]);
      } finally {
        setIsStreaming(false);
      }
    },
    [sessionId, isStreaming, onSessionCreated],
  );

  return { messages, sendMessage, isStreaming };
}
