import { create } from 'zustand';
import type { Product } from './types';

type ProductDetailStore = {
  product: Product | null;
  open: (product: Product) => void;
  close: () => void;
};

export const useProductDetailStore = create<ProductDetailStore>((set) => ({
  product: null,
  open: (product) => set({ product }),
  close: () => set({ product: null }),
}));
