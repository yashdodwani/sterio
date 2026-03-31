import { apiClient } from './client';
import { useCartStore } from '@/lib/cart-store';
import type { Product } from '@/lib/types';
import type { components } from '@/src/types/api.d.ts';

type BackendCartItem = components['schemas']['CartItem'];
type AddCartItem = components['schemas']['AddCartItem'];

function backendItemToProduct(item: BackendCartItem): Product {
  return {
    id: item.productId,
    name: item.productName,
    price: item.price,
    currency: 'USD',
    imageUrl: item.image,
    marketplace: item.retailer,
  };
}

export const cartApi = {
  async hydrate() {
    try {
      const data = await apiClient.get('cart').json<{ items: BackendCartItem[] }>();
      const items = data.items.map((item) => ({
        product: backendItemToProduct(item),
        backendId: item.id,
      }));
      useCartStore.getState().hydrate(items);
    } catch {
      // Not authenticated or network error — keep local state
    }
  },

  async addItem(product: Product) {
    // Optimistic update
    useCartStore.getState().add(product);

    try {
      const body: AddCartItem = {
        productId: product.id,
        productName: product.name,
        price: product.price,
        image: product.imageUrl,
        size: 'Default',
        color: 'Default',
        productUrl: product.productUrl || (product.asin ? `https://www.amazon.com/dp/${product.asin}` : 'https://example.com/item'),
        retailer: product.marketplace || 'Unknown',
      };
      const created = await apiClient.post('cart', { json: body }).json<BackendCartItem>();
      useCartStore.getState().setBackendId(product.id, created.id);
    } catch {
      // Keep optimistic state; backend may have rejected duplicate (409)
    }
  },

  async removeItem(productId: string) {
    const { items } = useCartStore.getState();
    const item = items.find((i) => i.product.id === productId);

    // Optimistic update
    useCartStore.getState().remove(productId);

    if (item?.backendId) {
      try {
        await apiClient.delete(`cart/${item.backendId}`);
      } catch {
        // Restore on failure
        useCartStore.getState().add(item.product, item.backendId);
      }
    }
  },

};
