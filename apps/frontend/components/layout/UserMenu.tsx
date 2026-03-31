'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { User, LogOut, Wallet, Mail, Circle, ArrowDownToLine } from 'lucide-react';
import { useAuth } from '@crossmint/client-sdk-react-ui';
import { useProfile } from '@/lib/api/profile';
import { useRouter } from 'next/navigation';

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function walletStatusColor(status: string) {
  if (status === 'active') return 'text-(--success)';
  if (status === 'pending') return 'text-(--warning)';
  return 'text-(--text-muted)';
}

interface UserMenuProps {
  onDepositClick: () => void;
}

export function UserMenu({ onDepositClick }: UserMenuProps) {
  const { logout } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const router = useRouter();
  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="Account"
          className="relative text-(--text-secondary) hover:text-(--text-primary) transition-colors outline-none data-[state=open]:text-(--text-primary)"
        >
          <User size={17} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={10}
          className="z-50 min-w-[220px] rounded-xl border border-(--border) bg-(--surface-elevated) p-1.5"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.45)', animation: 'slideDown 0.15s cubic-bezier(0.16,1,0.3,1)' }}
        >
          {/* User info section */}
          <div className="px-3 py-2.5 mb-1">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-(--primary) to-(--primary-light) flex items-center justify-center shrink-0">
                <User size={13} className="text-white" />
              </div>
              <span className="text-xs font-semibold text-(--text-primary) truncate">
                {isLoading ? 'Loading…' : profile?.email ?? '—'}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Mail size={11} className="text-(--text-muted) shrink-0" />
                <span className="text-[11px] text-(--text-secondary) truncate">
                  {profile?.email ?? '—'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Wallet size={11} className="text-(--text-muted) shrink-0" />
                <span className="text-[11px] font-mono text-(--text-secondary) truncate flex-1">
                  {profile?.walletAddress ? truncateAddress(profile.walletAddress) : 'No wallet'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Circle size={7} className={`shrink-0 fill-current ${walletStatusColor(profile?.walletStatus ?? '')}`} />
                <span className={`text-[11px] capitalize ${walletStatusColor(profile?.walletStatus ?? '')}`}>
                  {profile?.walletStatus ?? '—'}
                </span>
              </div>
            </div>
          </div>

          <DropdownMenu.Separator className="h-px bg-(--border) mx-1 mb-1" />

          <DropdownMenu.Item
            onSelect={onDepositClick}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--surface-elevated) transition-colors cursor-pointer outline-none"
          >
            <ArrowDownToLine size={13} />
            <span>Deposit Fund</span>
          </DropdownMenu.Item>

          <DropdownMenu.Item
            onSelect={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-(--text-secondary) hover:text-(--error) hover:bg-(--error)/8 transition-colors cursor-pointer outline-none"
          >
            <LogOut size={13} />
            <span>Sign out</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
