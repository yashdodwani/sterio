'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SquarePen, MessageSquare, Trash2 } from 'lucide-react';
import { useListSessions, deleteChatSession, SESSIONS_KEY } from '@/lib/api/sessions';
import type { components } from '@/src/types/api.d';

type SessionItem = components['schemas']['ChatSession'];
type Group = { label: string; items: SessionItem[] };

type Props = {
  activeSessionId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onActiveSessionDeleted?: () => void;
};

function groupByTime(sessions: SessionItem[]): Group[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  const startOf7Days = new Date(startOfToday.getTime() - 6 * 86400000);
  const startOf30Days = new Date(startOfToday.getTime() - 29 * 86400000);

  const groups: Group[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Last 7 days', items: [] },
    { label: 'Last 30 days', items: [] },
    { label: 'Older', items: [] },
  ];

  for (const s of sessions) {
    const d = new Date(s.updatedAt);
    if (d >= startOfToday) groups[0].items.push(s);
    else if (d >= startOfYesterday) groups[1].items.push(s);
    else if (d >= startOf7Days) groups[2].items.push(s);
    else if (d >= startOf30Days) groups[3].items.push(s);
    else groups[4].items.push(s);
  }

  return groups.filter((g) => g.items.length > 0);
}

function SessionRow({
  session,
  isActive,
  onSelect,
  onDeleted,
}: {
  session: SessionItem;
  isActive: boolean;
  onSelect: () => void;
  onDeleted: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [hovered, setHovered] = useState(false);
  const rowRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!confirming) return;
    const handler = (e: MouseEvent) => {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        setConfirming(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [confirming]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRemoving(true);
    try {
      await deleteChatSession(session.id);
      setTimeout(() => onDeleted(session.id), 300);
    } catch {
      setRemoving(false);
      setConfirming(false);
    }
  };

  const handleTrashClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirming(true);
  };

  const rowBg = confirming
    ? 'bg-red-500/[0.06]'
    : isActive
      ? 'bg-white/[0.09]'
      : 'hover:bg-white/5';

  const labelColor = isActive || hovered ? 'text-(--text-primary)' : 'text-(--text-secondary)';

  const trashVisible = (hovered || isActive) && !confirming;

  return (
    <li
      ref={rowRef}
      className={`relative overflow-hidden rounded-lg ${removing ? 'session-exit' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={`flex items-center gap-1.5 pl-2 pr-1.5 rounded-lg min-h-8 transition-colors ${rowBg}`}>
        <button
          onClick={onSelect}
          title={session.title ?? 'New chat'}
          className={`flex-1 min-w-0 flex items-center gap-2 text-left py-1.5 bg-transparent border-0 transition-colors ${labelColor}`}
        >
          <MessageSquare size={13} className="shrink-0 opacity-45" />
          <span className="text-[13px] leading-snug truncate">
            {session.title ?? 'New chat'}
          </span>
        </button>

        {!confirming && (
          <button
            onClick={handleTrashClick}
            title="Delete chat"
            aria-label="Delete chat"
            className={[
              'shrink-0 flex items-center justify-center w-[22px] h-[22px] rounded-[5px]',
              'bg-transparent text-(--text-muted) transition-all duration-150',
              'hover:bg-red-500/12 hover:text-red-400',
              trashVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90',
            ].join(' ')}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {confirming && (
        <div className="confirm-slide-in flex items-center gap-1 px-2.5 py-1">
          <span className="flex-1 text-[11px] text-(--text-muted) font-medium tracking-[0.01em]">
            Delete?
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); setConfirming(false); }}
            className="text-[11px] font-semibold px-2 py-0.5 rounded bg-white/6 text-(--text-secondary) transition-colors hover:bg-white/10 hover:text-(--text-primary)"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={removing}
            className="text-[11px] font-semibold px-2 py-0.5 rounded bg-red-500/18 text-red-300 transition-colors hover:bg-red-500/32 hover:text-red-200 disabled:opacity-50 disabled:cursor-default"
          >
            {removing ? '…' : 'Delete'}
          </button>
        </div>
      )}
    </li>
  );
}

export function ChatSidebar({ activeSessionId, isOpen, onClose, onSelectSession, onNewChat, onActiveSessionDeleted }: Props) {
  const { data, isLoading: loading } = useListSessions();
  const sessions = data?.sessions ?? [];
  const qc = useQueryClient();

  const handleDeleted = useCallback((id: string) => {
    qc.setQueryData(SESSIONS_KEY, (old: { sessions: SessionItem[] } | undefined) =>
      old ? { ...old, sessions: old.sessions.filter((s) => s.id !== id) } : old,
    );
    if (id === activeSessionId) onActiveSessionDeleted?.();
  }, [qc, activeSessionId, onActiveSessionDeleted]);

  const groups = groupByTime(sessions);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={[
          'flex-none overflow-hidden',
          'bg-(--surface) border-r border-(--border)',
          'transition-all duration-300 ease-in-out',
          'fixed md:relative top-0 left-0 h-full z-40 md:z-auto',
          isOpen
            ? 'w-[260px] translate-x-0'
            : 'w-[260px] md:w-0 -translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        <div className="flex flex-col h-full w-[260px]">

          <div className="px-3 pt-3 pb-1 flex-none">
            <button
              onClick={onNewChat}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-(--text-secondary) hover:text-(--text-primary) hover:bg-white/5 transition-all"
            >
              <SquarePen size={14} className="text-(--primary-light) flex-none" />
              <span>New chat</span>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
            {loading ? (
              <div className="flex flex-col gap-1.5 mt-2 px-1">
                {[72, 56, 80, 64].map((w, i) => (
                  <div
                    key={i}
                    className="h-7 rounded-lg bg-white/[0.04] animate-pulse"
                    style={{ width: `${w}%`, animationDelay: `${i * 80}ms` }}
                  />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-xs text-(--text-muted) text-center mt-8 px-4 leading-relaxed">
                No chats yet.<br />Start a conversation.
              </p>
            ) : (
              groups.map((group) => (
                <div key={group.label}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-(--text-muted) px-2 mb-1">
                    {group.label}
                  </p>
                  <ul className="space-y-px">
                    {group.items.map((s) => (
                      <SessionRow
                        key={s.id}
                        session={s}
                        isActive={s.id === activeSessionId}
                        onSelect={() => onSelectSession(s.id)}
                        onDeleted={handleDeleted}
                      />
                    ))}
                  </ul>
                </div>
              ))
            )}
          </nav>

        </div>
      </aside>
    </>
  );
}
