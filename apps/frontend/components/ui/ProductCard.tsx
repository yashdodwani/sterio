'use client';

import Image from 'next/image';
import { ShoppingCart, Eye, Check } from 'lucide-react';
import type { Product } from '@/lib/types';

type Props = {
  product: Product;
  variant?: 'carousel' | 'grid';
  isInCart?: boolean;
  onAddToCart: (product: Product) => void;
  onViewCart?: (product: Product) => void;
  onDetails: (product: Product) => void;
};

export function ProductCard({ product, variant = 'carousel', isInCart = false, onAddToCart, onViewCart, onDetails }: Props) {
  const isGrid = variant === 'grid';

  return (
    <div className={`product-card group/card ${isGrid ? 'w-full' : 'flex-none w-[260px]'} rounded-2xl overflow-hidden border border-(--border) bg-(--surface) flex flex-col`}>
      <div className={`relative ${isGrid ? 'h-[180px]' : 'h-[220px]'} overflow-hidden bg-(--surface-elevated)`}>
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover/card:scale-[1.04]"
          sizes={isGrid ? '(max-width: 768px) 50vw, 25vw' : '260px'}
          priority
        />
        <div
          className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
          style={{ background: 'linear-gradient(to top, var(--surface) 20%, transparent)' }}
        />
        <span
          className="absolute top-2.5 left-2.5 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-(--border) text-(--text-secondary)"
          style={{ background: 'rgba(9,9,11,0.82)', backdropFilter: 'blur(6px)' }}
        >
          {product.marketplace}
        </span>
      </div>

      <div className="p-3.5 flex flex-col flex-1 gap-2">
        <p className="text-[12px] font-medium line-clamp-2 leading-snug text-(--text-primary)" style={{ minHeight: '36px' }}>
          {product.name}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[17px] font-black font-mono tracking-tight text-(--text-primary)">
              {(product.price / 100).toFixed(2)}
            </span>
            <span className="text-[10px] font-medium text-(--text-muted)">{product.currency}</span>
          </div>
          {product.rating && (
            <div className="flex items-center gap-0.5">
              <span className="text-[10px]" style={{ color: 'var(--warning)' }}>★</span>
              <span className="text-[11px] font-medium text-(--text-secondary)">{product.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        <div className="flex gap-1.5 mt-auto pt-1">
          {isInCart ? (
            <button
              onClick={() => onViewCart?.(product)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl border border-transparent bg-(--primary) text-white hover:bg-(--primary-hover) transition-colors"
            >
              <Check size={11} />
              View Cart
            </button>
          ) : (
            <button
              onClick={() => onAddToCart(product)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl border border-(--primary) text-(--primary) hover:bg-(--primary) hover:text-white transition-colors"
            >
              <ShoppingCart size={11} />
              Add to Cart
            </button>
          )}
          <button
            onClick={() => onDetails(product)}
            className="flex-none w-9 flex items-center justify-center rounded-xl border border-(--border) text-(--text-secondary) hover:border-(--text-secondary) hover:text-(--text-primary) transition-colors"
            aria-label="View details"
          >
            <Eye size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
