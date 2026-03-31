export interface ColorOption {
  name: string
  hex: string
}

export interface ProductCard {
  id: string
  name: string
  image: string
  images?: string[]
  /** Price in cents */
  price: number
  currency: "USD"
  sizes: string[]
  colors: ColorOption[]
  retailer: string
  product_url: string
  rating?: number
  reviewCount?: number
  brand?: string
  description?: string
  category?: string
}

export interface ProductDetail extends ProductCard {
  fullDescription: string
  specifications: Record<string, string>
  /** Required in detail view; overrides optional field from ProductCard */
  images: string[]
  availability: "in_stock" | "limited" | "out_of_stock"
}

export interface ProductSearchParams {
  query: string
  category?: string
  brand?: string
  /** Minimum price in USD dollars */
  minPrice?: number
  /** Maximum price in USD dollars */
  maxPrice?: number
  /** Minimum rating (0-5) */
  minRating?: number
  size?: string
  color?: string
  /** Page number (1-based), defaults to 1 */
  page?: number
  /** Defaults to 5 */
  limit?: number
}

export interface ProductSearchResult {
  products: ProductCard[]
  totalResults: number
  query: string
}

// ---------------------------------------------------------------------------
// External scraping API response types
// ---------------------------------------------------------------------------

export interface ScrapingProduct {
  asin: string
  title: string
  description?: string
  brand?: string
  category?: string
  price?: number | null
  originalPrice?: number | null
  discountPercent?: number | null
  rating?: number | null
  available: boolean
  images: string[]
  productUrl: string
  specifications: Record<string, string>
  lastUpdated: string
}

export interface ScrapingSearchResponse {
  products: ScrapingProduct[]
  total: number
  page: number
  limit: number
  totalPage: number
  source: string
  query: string
  executionTime: number
}

export interface ScrapingProductDetailResponse {
  success: boolean
  data: ScrapingProduct | null
  source: string
}
