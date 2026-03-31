'use client';

import { PanelLeftOpen, PanelLeftClose, SquarePen } from 'lucide-react';

type Props = {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  onNewChat: () => void;
};

// Absolutely positioned — takes no layout space, floats over the chat content
export function Header({ onToggleSidebar, sidebarOpen, onNewChat }: Props) {
  return (
    <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 h-12 pointer-events-none">
      <button
        onClick={onToggleSidebar}
        aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        className="pointer-events-auto p-1.5 rounded-lg transition-colors cursor-pointer"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
      >
        {sidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
      </button>

      <button
        onClick={onNewChat}
        aria-label="New chat"
        className="pointer-events-auto p-1.5 rounded-lg transition-colors cursor-pointer"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
      >
        <SquarePen size={16} />
      </button>
    </div>
  );
}
