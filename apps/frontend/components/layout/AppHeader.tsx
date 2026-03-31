'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/lib/cart-store';
import { UserMenu } from './UserMenu';
import { WalletBalance } from '@/components/ui/WalletBalance';
import { DepositModal } from '@/components/ui/DepositModal';

export function AppHeader() {
  const { items, open } = useCartStore();
  const cartCount = items.length;
  const [depositOpen, setDepositOpen] = useState(false);

  return (
    <header className="h-12 flex items-center px-4 gap-6 border-b border-(--border) bg-(--surface) flex-none">
      <Link href="/app" className="flex items-center gap-2 shrink-0">
        <Image src="/logo.jpg" alt="Purch" width={24} height={24} className="rounded-md" />
        <span className="font-semibold text-sm text-(--text-primary) tracking-tight">Purch</span>
      </Link>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <WalletBalance />

        <button
          onClick={open}
          aria-label="Cart"
          className="relative text-(--text-secondary) hover:text-(--text-primary) transition-colors"
        >
          <ShoppingCart size={17} />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1.5 text-[9px] bg-(--primary) text-white rounded-full w-3.5 h-3.5 flex items-center justify-center">
              {cartCount > 9 ? '9+' : cartCount}
            </span>
          )}
        </button>

        <UserMenu onDepositClick={() => setDepositOpen(true)} />
      </div>

      {depositOpen && <DepositModal onClose={() => setDepositOpen(false)} />}
    </header>
  );
}
