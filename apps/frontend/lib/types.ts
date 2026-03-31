export type Product = {
  id: string;
  name: string;
  price: number;
  currency: 'USD' | 'USDC';
  imageUrl: string;
  marketplace: string;
  productUrl?: string;
  asin?: string;
  rating?: number;
  reviewCount?: string;
};

export type CartItem = {
  product: Product;
  backendId?: string; // backend cart item UUID, required for DELETE
};
