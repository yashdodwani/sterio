import { create } from 'zustand';
import type { CartItem, Product } from './types';

type CartStore = {
  items: CartItem[];
  isOpen: boolean;
  add: (product: Product, backendId?: string) => void;
  remove: (productId: string) => void;
  hydrate: (items: CartItem[]) => void;
  setBackendId: (productId: string, backendId: string) => void;
  open: () => void;
  close: () => void;
};

export const useCartStore = create<CartStore>()((set) => ({
  items: [],
  isOpen: false,
  add: (product, backendId) =>
    set((s) => {
      if (s.items.find((i) => i.product.id === product.id)) return s;
      return { items: [...s.items, { product, backendId }] };
    }),
  remove: (productId) =>
    set((s) => ({ items: s.items.filter((i) => i.product.id !== productId) })),
  hydrate: (incoming) =>
    set((s) => {
      const pending = s.items.filter((i) => !i.backendId);
      const merged = [...incoming, ...pending.filter((p) => !incoming.some((b) => b.product.id === p.product.id))];
      return { items: merged };
    }),
  setBackendId: (productId, backendId) =>
    set((s) => ({ items: s.items.map((i) => i.product.id === productId ? { ...i, backendId } : i) })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
