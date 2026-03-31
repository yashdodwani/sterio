'use client';

import { useEffect, useRef } from 'react';
import { ShoppingBag } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import type { ChatMessage } from '@/lib/chat/types';

const SUGGESTIONS = ['Summer dresses', 'Running shoes', 'Minimalist watch', 'Linen trousers'];

type Props = {
  messages: ChatMessage[];
  isStreaming?: boolean;
  onSuggestion?: (text: string) => void;
};

export function ChatWindow({ messages, onSuggestion }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);

  useEffect(() => {
    if (messages.length > prevLengthRef.current) {
      prevLengthRef.current = messages.length;
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto relative">
      <div className="px-4 pt-14 pb-6 md:px-8 min-h-full flex flex-col">
        <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 select-none relative">
              {/* Ambient orb */}
              <div
                className="absolute w-80 h-80 rounded-full pointer-events-none"
                style={{
                  background: 'radial-gradient(circle at center, rgba(108,92,231,0.1) 0%, transparent 65%)',
                  filter: 'blur(36px)',
                  animation: 'orbBreathe 5s ease-in-out infinite',
                }}
              />

              <div
                className="relative mb-5 w-12 h-12 rounded-2xl flex items-center justify-center z-10"
                style={{
                  background: 'linear-gradient(135deg, rgba(162,155,254,0.14), rgba(108,92,231,0.07))',
                  border: '1px solid rgba(162,155,254,0.14)',
                }}
              >
                <ShoppingBag size={20} style={{ color: 'var(--primary-light)' }} />
              </div>

              <h2
                className="text-[23px] font-semibold tracking-tight mb-2 z-10"
                style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--text-primary)' }}
              >
                Find anything.
              </h2>
              <p className="text-[13px] z-10" style={{ color: 'var(--text-muted)' }}>
                Tell me what you&apos;re after — I&apos;ll curate the best picks.
              </p>

              <div className="flex flex-wrap gap-2 mt-6 justify-center max-w-xs z-10">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => onSuggestion?.(s)}
                    className="px-3.5 py-1.5 rounded-full text-[12px] transition-all duration-200"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      color: 'var(--text-secondary)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} onSuggestion={onSuggestion} />
              ))}
            </>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Bottom fade */}
      <div
        className="sticky bottom-0 left-0 right-0 h-10 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, var(--bg))' }}
      />
    </div>
  );
}
