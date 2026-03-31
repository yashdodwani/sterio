import { Duration, Effect, Layer } from "effect"
import { ProductNotFound } from "../lib/errors.js"
import type { ProductCard, ProductDetail, ProductSearchParams, ProductSearchResult } from "../types/product.js"
import { ProductService, type ProductServiceShape } from "./product-service.js"

// ---------------------------------------------------------------------------
// Hardcoded mock data (6 products for demo/test use)
// ---------------------------------------------------------------------------

const MOCK_PRODUCTS: ProductCard[] = [
  {
    id: "B08GBYFVWB",
    name: "Nike Air Zoom Pegasus 40 Running Shoes",
    image: "https://example.com/images/nike-pegasus-40.jpg",
    images: ["https://example.com/images/nike-pegasus-40-side.jpg"],
    price: 12000,
    currency: "USD",
    sizes: ["7", "8", "9", "10", "11", "12"],
    colors: [
      { name: "Black", hex: "#000000" },
      { name: "White", hex: "#FFFFFF" },
    ],
    retailer: "Amazon",
    product_url: "https://amazon.com/dp/B08GBYFVWB",
    rating: 4.5,
    reviewCount: 2847,
    brand: "Nike",
    description: "Responsive cushioning with Air Zoom units for a fast, smooth ride",
    category: "Running Shoes",
  },
  {
    id: "B09KLMN123",
    name: "ASICS Gel-Kayano 30 Stability Running Shoes",
    image: "https://example.com/images/asics-kayano-30.jpg",
    price: 15999,
    currency: "USD",
    sizes: ["7", "8", "9", "10", "11"],
    colors: [
      { name: "Blue", hex: "#0000FF" },
      { name: "Gray", hex: "#808080" },
    ],
    retailer: "Amazon",
    product_url: "https://amazon.com/dp/B09KLMN123",
    rating: 4.7,
    reviewCount: 1523,
    brand: "ASICS",
    description: "Premium stability shoe with FLYTEFOAM technology for long-distance comfort",
    category: "Running Shoes",
  },
  {
    id: "B07XQRST45",
    name: "Brooks Ghost 16 Neutral Running Shoes",
    image: "https://example.com/images/brooks-ghost-16.jpg",
    price: 13999,
    currency: "USD",
    sizes: ["6", "7", "8", "9", "10", "11", "12"],
    colors: [
      { name: "Navy", hex: "#000080" },
      { name: "Rose", hex: "#FF007F" },
    ],
    retailer: "Amazon",
    product_url: "https://amazon.com/dp/B07XQRST45",
    rating: 4.6,
    reviewCount: 3201,
    brand: "Brooks",
    description: "DNA LOFT v3 cushioning delivers a perfectly balanced feel underfoot",
    category: "Running Shoes",
  },
  {
    id: "B06PQRST67",
    name: "New Balance Fresh Foam X 880v13",
    image: "https://example.com/images/nb-880v13.jpg",
    price: 13999,
    currency: "USD",
    sizes: ["7", "8", "9", "10", "11", "12", "13"],
    colors: [
      { name: "Black", hex: "#000000" },
      { name: "White", hex: "#FFFFFF" },
      { name: "Red", hex: "#FF0000" },
    ],
    retailer: "Amazon",
    product_url: "https://amazon.com/dp/B06PQRST67",
    rating: 4.4,
    reviewCount: 987,
    brand: "New Balance",
    description: "Fresh Foam X midsole for a plush, yet responsive everyday trainer",
    category: "Running Shoes",
  },
  {
    id: "B05UVWXY89",
    name: "Saucony Kinvara 14 Lightweight Running Shoes",
    image: "https://example.com/images/saucony-kinvara-14.jpg",
    price: 10999,
    currency: "USD",
    sizes: ["7", "8", "9", "10", "11"],
    colors: [
      { name: "Orange", hex: "#FFA500" },
      { name: "Teal", hex: "#008080" },
    ],
    retailer: "Amazon",
    product_url: "https://amazon.com/dp/B05UVWXY89",
    rating: 4.3,
    reviewCount: 654,
    brand: "Saucony",
    description: "Lightweight trainer built for speed with PWRRUN cushioning",
    category: "Running Shoes",
  },
  {
    id: "B04ABCDE01",
    name: "Hoka Clifton 9 Max-Cushion Running Shoes",
    image: "https://example.com/images/hoka-clifton-9.jpg",
    price: 14999,
    currency: "USD",
    sizes: ["7", "8", "9", "10", "11", "12"],
    colors: [
      { name: "Cloud White", hex: "#F8F8FF" },
      { name: "Midnight Blue", hex: "#191970" },
    ],
    retailer: "Amazon",
    product_url: "https://amazon.com/dp/B04ABCDE01",
    rating: 4.8,
    reviewCount: 4102,
    brand: "Hoka",
    description: "Plush, road-ready cushioning with lightweight construction",
    category: "Running Shoes",
  },
]

const MOCK_DETAILS: Record<string, ProductDetail> = {
  B08GBYFVWB: {
    ...MOCK_PRODUCTS[0]!,
    images: [
      "https://example.com/images/nike-pegasus-40.jpg",
      "https://example.com/images/nike-pegasus-40-side.jpg",
      "https://example.com/images/nike-pegasus-40-bottom.jpg",
    ],
    fullDescription:
      "The Nike Air Zoom Pegasus 40 provides everyday support and a smooth, responsive ride. " +
      "Air Zoom units in the forefoot and heel provide a springy feel, while the redesigned upper " +
      "offers a snug, sock-like fit.",
    specifications: {
      Weight: "9.8 oz",
      Drop: "10mm",
      "Upper Material": "Mesh",
      "Closure Type": "Lace-up",
      "Recommended Use": "Road Running",
    },
    availability: "in_stock",
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomLatencyMs(): number {
  return 300 + Math.random() * 500
}

function filterProducts(products: ProductCard[], params: ProductSearchParams): ProductCard[] {
  let result = [...products]

  if (params.category) {
    const cat = params.category.toLowerCase()
    result = result.filter((p) => p.category?.toLowerCase().includes(cat))
  }
  if (params.minPrice !== undefined) {
    result = result.filter((p) => p.price >= params.minPrice! * 100)
  }
  if (params.maxPrice !== undefined) {
    result = result.filter((p) => p.price <= params.maxPrice! * 100)
  }
  if (params.size) {
    result = result.filter((p) => p.sizes.includes(params.size!))
  }
  if (params.color) {
    const color = params.color.toLowerCase()
    result = result.filter((p) => p.colors.some((c) => c.name.toLowerCase().includes(color)))
  }
  if (params.query) {
    const q = params.query.toLowerCase()
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q)
    )
  }

  return result.slice(0, params.limit ?? 5)
}

// ---------------------------------------------------------------------------
// Implementation + Layer
// ---------------------------------------------------------------------------

const mockImpl: ProductServiceShape = {
  search: (params: ProductSearchParams): Effect.Effect<ProductSearchResult, never> =>
    Effect.gen(function* () {
      yield* Effect.sleep(Duration.millis(randomLatencyMs()))
      const products = filterProducts(MOCK_PRODUCTS, params)
      return { products, totalResults: products.length, query: params.query }
    }),

  getDetails: (productId: string): Effect.Effect<ProductDetail, ProductNotFound> =>
    Effect.gen(function* () {
      yield* Effect.sleep(Duration.millis(randomLatencyMs()))
      const detail = MOCK_DETAILS[productId]
      if (!detail) return yield* Effect.fail(new ProductNotFound({ productId }))
      return detail
    }),
}

export const MockProductServiceLive = Layer.succeed(ProductService, mockImpl)
