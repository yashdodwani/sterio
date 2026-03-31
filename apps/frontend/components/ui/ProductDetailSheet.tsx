'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { X, ExternalLink, Star, ShoppingCart, Check } from 'lucide-react';
import type { Product } from '@/lib/types';

type Props = {
  product: Product;
  isInCart: boolean;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
  onViewCart: () => void;
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={13}
          style={{
            fill: i <= Math.round(rating) ? 'var(--warning)' : 'var(--border)',
            color: i <= Math.round(rating) ? 'var(--warning)' : 'var(--border)',
          }}
        />
      ))}
    </div>
  );
}

export function ProductDetailSheet({ product, isInCart, onClose, onAddToCart, onViewCart }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="modal-enter relative z-10 w-full sm:max-w-[420px] rounded-t-[20px] sm:rounded-[20px] overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88dvh]"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(162,155,254,0.06)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-20 w-7 h-7 rounded-full flex items-center justify-center transition-colors text-(--text-muted) hover:text-(--text-primary)"
          style={{ background: 'rgba(255,255,255,0.07)' }}
        >
          <X size={14} />
        </button>

        {/* Hero image */}
        <div className="relative w-full aspect-[4/3] flex-none bg-(--surface-elevated) overflow-hidden">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            sizes="420px"
            priority
          />
          <div
            className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
            style={{ background: 'linear-gradient(to top, var(--surface), transparent)' }}
          />
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 pt-3 pb-2 space-y-3">
          <div className="flex items-center justify-between">
            <span
              className="text-[9px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full border border-(--border) text-(--text-muted)"
              style={{ background: 'var(--surface-elevated)' }}
            >
              {product.marketplace}
            </span>
            {(product.productUrl ?? product.asin) && (
              <a
                href={product.productUrl ?? `https://www.amazon.com/dp/${product.asin}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] font-semibold text-(--primary-light) hover:underline"
              >
                View on {product.marketplace || 'Amazon'} <ExternalLink size={10} />
              </a>
            )}
          </div>

          <h2 className="text-[15px] font-bold leading-snug text-(--text-primary)">
            {product.name}
          </h2>

          {product.rating != null && (
            <div className="flex items-center gap-2">
              <StarRating rating={product.rating} />
              <span className="text-[12px] font-bold text-(--text-primary)">{product.rating.toFixed(1)}</span>
              {product.reviewCount && (
                <span className="text-[11px] text-(--text-muted)">({product.reviewCount.toLocaleString()} reviews)</span>
              )}
            </div>
          )}

          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-none text-[10px] font-black text-white"
              style={{ background: 'var(--primary)' }}
            >
              $
            </div>
            <span className="text-xl font-black font-mono tracking-tight text-(--text-primary)">
              {(product.price / 100).toFixed(2)}
            </span>
            <span className="text-[11px] font-medium text-(--text-muted)">{product.currency}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 flex flex-col gap-2 border-t border-(--border)">
          {isInCart ? (
            <button
              onClick={onViewCart}
              className="w-full flex items-center justify-center gap-2 py-3 text-[12px] font-bold uppercase tracking-wider rounded-xl bg-(--primary) hover:bg-(--primary-hover) text-white transition-colors"
            >
              <Check size={13} />
              View Cart
            </button>
          ) : (
            <button
              onClick={() => onAddToCart(product)}
              className="w-full flex items-center justify-center gap-2 py-3 text-[12px] font-bold uppercase tracking-wider rounded-xl border-2 border-(--primary) text-(--primary) hover:bg-(--primary) hover:text-white transition-colors"
            >
              <ShoppingCart size={13} />
              Add to Cart
            </button>
          )}
          <button
            disabled
            className="w-full py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-xl cursor-not-allowed text-(--text-muted) bg-(--surface-elevated)"
          >
            Buy with USDC — Coming Soon
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
