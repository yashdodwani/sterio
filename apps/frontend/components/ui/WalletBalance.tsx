'use client';

import { useMntBalance } from '@/lib/api/balance';

export function WalletBalance() {
  const { data: balance, isLoading, isError } = useMntBalance();

  if (isLoading) {
    return (
      <div
        className="balance-shimmer h-6 w-28 rounded-full"
        aria-label="Loading balance"
      />
    );
  }

  const amount =
    !isError && balance != null
      ? parseFloat(balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '—';

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 h-6 rounded-full border border-(--border) bg-(--surface-elevated) select-none"
      style={{ boxShadow: '0 0 0 1px rgba(108,92,231,0.07) inset' }}
      title={`MNT balance on Base Sepolia: ${amount}`}
    >
      <span
        className="w-[5px] h-[5px] rounded-full bg-(--primary) shrink-0"
        style={{ animation: 'orbBreathe 2.8s ease-in-out infinite', boxShadow: '0 0 4px rgba(108,92,231,0.6)' }}
      />
      <span className="font-mono text-[11px] text-(--text-primary) tracking-tight tabular-nums leading-none">
        {amount}
      </span>
      <span className="text-[9px] font-semibold text-(--text-muted) uppercase tracking-[0.12em] leading-none">
        MNT
      </span>
    </div>
  );
}
