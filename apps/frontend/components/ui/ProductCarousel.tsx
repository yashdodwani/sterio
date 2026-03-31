'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductCard } from './ProductCard';
import { ProductDetailSheet } from './ProductDetailSheet';
import { useCartStore } from '@/lib/cart-store';
import { cartApi } from '@/lib/api/cart';
import type { Product } from '@/lib/types';

type Props = {
  products: Product[];
  intro?: string;
  query?: string;
};

export function ProductCarousel({ products, intro }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { items: cartItems, open } = useCartStore();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    // Small delay to let layout settle before measuring
    const t = setTimeout(updateScrollState, 50);
    return () => clearTimeout(t);
  }, [products, updateScrollState]);

  function scroll(dir: 'left' | 'right') {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -280 : 280, behavior: 'smooth' });
  }

  function handleAddToCart(product: Product) {
    cartApi.addItem(product);
    open();
  }

  const items = products.slice(0, 8);

  return (
    <div className="my-3 w-full">
      {intro && (
        <p className="text-sm text-(--text-secondary) mb-3">{intro}</p>
      )}
      <div className="relative group/carousel">
        {/* Left edge */}
        <div
          className={`absolute left-0 top-0 bottom-2 w-14 z-10 flex items-center transition-opacity duration-200 ${canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          style={{ background: 'linear-gradient(to right, var(--bg) 20%, transparent)' }}
        >
          <button
            onClick={() => scroll('left')}
            className="pointer-events-auto ml-1 w-7 h-7 rounded-full border border-(--border) bg-(--surface-elevated) text-(--text-secondary) flex items-center justify-center shadow-md hover:text-(--text-primary) transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft size={13} />
          </button>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2"
          style={{ scrollbarWidth: 'none' }}
          onScroll={updateScrollState}
        >
          {items.map((product) => (
            <div key={product.id} className="snap-start">
              <ProductCard
                product={product}
                isInCart={cartItems.some((i) => i.product.id === product.id)}
                onAddToCart={handleAddToCart}
                onViewCart={() => open()}
                onDetails={() => setSelectedProduct(product)}
              />
            </div>
          ))}
        </div>

        {/* Right edge */}
        <div
          className={`absolute right-0 top-0 bottom-2 w-14 z-10 flex items-center justify-end transition-opacity duration-200 ${canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          style={{ background: 'linear-gradient(to left, var(--bg) 20%, transparent)' }}
        >
          <button
            onClick={() => scroll('right')}
            className="pointer-events-auto mr-1 w-7 h-7 rounded-full border border-(--border) bg-(--surface-elevated) text-(--text-secondary) flex items-center justify-center shadow-md hover:text-(--text-primary) transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {selectedProduct && (
        <ProductDetailSheet
          product={selectedProduct}
          isInCart={cartItems.some((i) => i.product.id === selectedProduct.id)}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={(p) => { handleAddToCart(p); setSelectedProduct(null); }}
          onViewCart={() => { setSelectedProduct(null); open(); }}
        />
      )}
    </div>
  );
}
