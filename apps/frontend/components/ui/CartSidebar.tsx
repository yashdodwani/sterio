'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, Trash2, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/lib/cart-store';
import { cartApi } from '@/lib/api/cart';
import { CheckoutModal } from './CheckoutModal';

type CheckoutTarget = { backendId: string; name: string; price: number };

export function CartSidebar() {
  const { items, isOpen, close } = useCartStore();
  const [checkoutTarget, setCheckoutTarget] = useState<CheckoutTarget | null>(null);

  const subtotal = items.reduce((sum, i) => sum + i.product.price / 100, 0);

  const handleCheckoutDone = () => {
    if (checkoutTarget) {
      // Item was deleted by backend during checkout — remove from local state
      const { items: currentItems, remove } = useCartStore.getState();
      const item = currentItems.find((i) => i.backendId === checkoutTarget.backendId);
      if (item) remove(item.product.id);
    }
    setCheckoutTarget(null);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={close}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-[400px] bg-(--surface) z-50 flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-(--border)">
          <h2 className="font-semibold text-xs uppercase tracking-widest text-(--text-primary)">Your Cart</h2>
          <button onClick={close} aria-label="Close cart" className="p-1 rounded hover:bg-(--surface-elevated) text-(--text-secondary)">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {items.length === 0 ? (
            <p className="text-sm text-(--text-muted) text-center mt-10">Your cart is empty.</p>
          ) : (
            items.map(({ product, backendId }) => (
              <div key={product.id} className="flex gap-3 items-start">
                <div className="relative w-16 h-16 flex-none rounded-lg overflow-hidden bg-(--surface-elevated)">
                  <Image src={product.imageUrl} alt={product.name} fill className="object-cover" sizes="64px" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide leading-snug line-clamp-2 text-(--text-primary)">
                    {product.name}
                  </p>
                  <p className="text-xs text-(--text-secondary) mt-0.5 font-mono">
                    ${(product.price / 100).toFixed(2)}
                  </p>
                  {backendId && (
                    <button
                      onClick={() =>
                        setCheckoutTarget({ backendId, name: product.name, price: product.price })
                      }
                      className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-(--primary) hover:text-(--primary-hover) transition-colors"
                    >
                      <ShoppingBag size={10} />
                      Buy
                    </button>
                  )}
                </div>
                <button
                  onClick={() => cartApi.removeItem(product.id)}
                  aria-label="Remove item"
                  className="p-1 rounded hover:bg-(--surface-elevated) text-(--text-muted)"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="px-5 py-4 border-t border-(--border)">
            <div className="flex justify-between text-sm">
              <span className="text-(--text-secondary)">Subtotal</span>
              <span className="font-mono font-semibold text-(--text-primary)">${subtotal.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {checkoutTarget && (
        <CheckoutModal
          cartItemId={checkoutTarget.backendId}
          itemName={checkoutTarget.name}
          itemPrice={checkoutTarget.price}
          onDone={handleCheckoutDone}
          onBack={() => setCheckoutTarget(null)}
        />
      )}
    </>
  );
}
