'use client';

import { useRef } from 'react';
import { ArrowUp } from 'lucide-react';

type Props = {
  input: string;
  onChange: React.ChangeEventHandler<HTMLTextAreaElement>;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  disabled?: boolean;
};

export function InputBar({ input, onChange, onSubmit, disabled }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && input.trim()) {
        e.currentTarget.form?.requestSubmit();
      }
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }

  const hasInput = input.trim().length > 0;

  return (
    <div className="px-4 pb-5 pt-1 md:px-8">
      <form onSubmit={onSubmit} className="max-w-2xl mx-auto">
        <div className="relative group">
          {/* Ambient glow behind the bar on focus */}
          <div
            className="absolute -inset-px rounded-[22px] opacity-0 group-focus-within:opacity-100 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 80% 70% at 50% 110%, rgba(108,92,231,0.22), transparent)',
              filter: 'blur(22px)',
              transition: 'opacity 0.6s ease',
            }}
          />

          {/* Input container — gradient border via padding-box/border-box trick */}
          <div
            className="relative flex items-end gap-3 rounded-[18px] px-4 py-3"
            style={{
              background: 'linear-gradient(var(--surface-elevated), var(--surface-elevated)) padding-box, linear-gradient(135deg, rgba(162,155,254,0.22) 0%, rgba(108,92,231,0.07) 50%, rgba(162,155,254,0.22) 100%) border-box',
              border: '1px solid transparent',
              transition: 'background 0.3s ease',
            }}
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={onChange}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask Purch to find something for you..."
              disabled={disabled}
              className="flex-1 resize-none bg-transparent text-[13.5px] outline-none leading-relaxed disabled:opacity-50 max-h-36 overflow-y-auto"
              style={{
                color: 'var(--text-primary)',
                caretColor: 'var(--primary-light)',
              }}
            />
            <button
              type="submit"
              disabled={disabled || !hasInput}
              aria-label="Send message"
              className="flex-none w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-20"
              style={{
                background: hasInput
                  ? 'linear-gradient(135deg, #A29BFE 0%, #6C5CE7 100%)'
                  : 'rgba(255,255,255,0.08)',
                boxShadow: hasInput ? '0 0 14px rgba(108,92,231,0.45)' : 'none',
                transform: 'scale(1)',
              }}
              onMouseEnter={e => { if (hasInput) e.currentTarget.style.transform = 'scale(1.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <ArrowUp size={13} color="white" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
