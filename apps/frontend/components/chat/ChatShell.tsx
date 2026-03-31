'use client';

import { useState } from 'react';
import { useSSEChat } from '@/lib/chat/use-sse-chat';
import type { ChatMessage } from '@/lib/chat/types';
import { Header } from './Header';
import { ChatWindow } from './ChatWindow';
import { InputBar } from './InputBar';

type Props = {
  sessionId: string | null;
  initialMessages: ChatMessage[];
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onNewChat: () => void;
  onSessionCreated: (sessionId: string) => void;
};

export function ChatShell({ sessionId, initialMessages, sidebarOpen, onToggleSidebar, onNewChat, onSessionCreated }: Props) {
  const [input, setInput] = useState('');
  const { messages, sendMessage, isStreaming } = useSSEChat({ sessionId, initialMessages, onSessionCreated });

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    sendMessage(text);
  }

  return (
    <div className="relative flex flex-col flex-1 min-h-0">
      <Header onToggleSidebar={onToggleSidebar} sidebarOpen={sidebarOpen} onNewChat={onNewChat} />
      <ChatWindow messages={messages} isStreaming={isStreaming} onSuggestion={setInput} />
      <InputBar
        input={input}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        disabled={isStreaming}
      />
    </div>
  );
}
