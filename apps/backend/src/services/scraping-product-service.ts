import { Effect, Layer, Schedule, Duration } from "effect";
import { env } from "../lib/env.js";
import logger from "../lib/logger.js";
import { ProductNotFound, ScrapingServiceUnavailable } from "../lib/errors.js";
import { CacheService } from "./cache-service.js";
import { ProductService, type ProductServiceShape } from "./product-service.js";
import type {
  ProductCard,
  ProductDetail,
  ProductSearchParams,
  ProductSearchResult,
  ScrapingProduct,
  ScrapingProductDetailResponse,
  ScrapingSearchResponse,
} from "../types/product.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const FETCH_TIMEOUT_MS = 60_000;
const CACHE_TTL_SECONDS = 60 * 60; // 1 hour — long enough for cart validation after search
const RETRY_SCHEDULE = Schedule.exponential("2 seconds").pipe(
  Schedule.compose(Schedule.recurs(2)),
);

// ---------------------------------------------------------------------------
// Mapper: ScrapingProduct → ProductCard
// ---------------------------------------------------------------------------

/** Normalise a dollar price that may arrive in cents from the scraping API. */
function sanitizePrice(raw: number | null | undefined): number {
  if (raw == null) return 0;
  // Apify sometimes returns price in cents (e.g. 841337 instead of 20.99).
  // Amazon products rarely exceed $10 000, so treat values > 10 000 as cents.
  const dollars = raw > 10_000 ? raw / 100 : raw;
  return Math.round(dollars * 100); // → store as integer cents
}

function toProductCard(sp: ScrapingProduct): ProductCard {
  return {
    id: sp.asin,
    name: sp.title,
    image: sp.images[0] ?? "",
    images: sp.images,
    price: sanitizePrice(sp.price),
    currency: "USD",
    sizes: [],
    colors: [],
    retailer: "Amazon",
    product_url: sp.productUrl,
    rating: sp.rating ?? undefined,
    brand: sp.brand ?? undefined,
    description: sp.description ?? undefined,
    category: sp.category ?? undefined,
  };
}

function toProductDetail(sp: ScrapingProduct): ProductDetail {
  const card = toProductCard(sp);
  return {
    ...card,
    images: sp.images,
    fullDescription: sp.description ?? sp.title,
    specifications: sp.specifications,
    availability: sp.available ? "in_stock" : "out_of_stock",
  };
}

// ---------------------------------------------------------------------------
// Cache key helpers
// ---------------------------------------------------------------------------

function searchCacheKey(query: string): string {
  return `scraping:search:${query.toLowerCase().trim()}`;
}

function productCacheKey(asin: string): string {
  return `scraping:product:${asin}`;
}

// ---------------------------------------------------------------------------
// Implementation factory (requires CacheService)
// ---------------------------------------------------------------------------

function makeScrapingImpl(cache: {
  get: (key: string) => Effect.Effect<string, any>;
  set: (key: string, value: string, ttl: number) => Effect.Effect<void, any>;
}): ProductServiceShape {
  const baseUrl = env.SCRAPING_SERVICE_URL || "http://localhost:3000";

  const fetchSearch = (
    params: ProductSearchParams,
  ): Effect.Effect<ScrapingSearchResponse, ScrapingServiceUnavailable> =>
    Effect.tryPromise({
      try: async () => {
        // Pass query, brand, maxPrice, pagination to scraping API
        // minPrice/category/rating filters are unreliable server-side — applied client-side instead
        const qs = new URLSearchParams({ q: params.query });
        if (params.limit != null) qs.set("limit", String(params.limit));
        if (params.page != null && params.page > 1) qs.set("page", String(params.page));
        if (params.brand) qs.set("brand", params.brand);
        if (params.minPrice != null && params.minPrice > 0) qs.set("minPrice", String(params.minPrice));
        if (params.maxPrice != null) qs.set("maxPrice", String(params.maxPrice));
        const url = `${baseUrl}/api/search/realtime?${qs.toString()}`;
        const res = await fetch(url, {
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!res.ok)
          throw new Error(`Scraping API ${res.status}: ${res.statusText}`);
        const body = await res.json();
        // API may return { success, code, data: { products, ... } } or flat { products, ... }
        return (body.data ?? body) as ScrapingSearchResponse;
      },
      catch: (cause) => new ScrapingServiceUnavailable({ cause }),
    }).pipe(Effect.retry(RETRY_SCHEDULE));

  const fetchProductByAsin = (
    asin: string,
  ): Effect.Effect<ScrapingProduct | null, ScrapingServiceUnavailable> =>
    Effect.tryPromise({
      try: async () => {
        const url = `${baseUrl}/api/search/realtime/product/${encodeURIComponent(asin)}`;
        const res = await fetch(url, {
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!res.ok)
          throw new Error(
            `Scraping detail API ${res.status}: ${res.statusText}`,
          );
        const body = (await res.json()) as ScrapingProductDetailResponse;
        return body.data;
      },
      catch: (cause) => new ScrapingServiceUnavailable({ cause }),
    }).pipe(Effect.retry(RETRY_SCHEDULE));

  const search = (
    params: ProductSearchParams,
  ): Effect.Effect<ProductSearchResult, ScrapingServiceUnavailable> =>
    Effect.gen(function* () {
      const searchParams = { ...params, limit: params.limit ?? 5, page: params.page ?? 1 };
      const data = yield* fetchSearch(searchParams);
      let products = data.products.map(toProductCard);

      // Client-side filtering — scraping API filters are unreliable
      // Guard against falsy/zero values the LLM sends as defaults
      // Products with unknown price (0) are kept — better to show them than hide matches
      if (params.minPrice != null && params.minPrice > 0) {
        products = products.filter((p) => p.price === 0 || p.price >= params.minPrice! * 100);
      }
      if (params.maxPrice != null && params.maxPrice > 0) {
        products = products.filter((p) => p.price === 0 || p.price <= params.maxPrice! * 100);
      }
      if (params.brand && params.brand.trim()) {
        const b = params.brand.toLowerCase().trim();
        products = products.filter((p) => p.brand?.toLowerCase().includes(b));
      }
      if (params.minRating != null && params.minRating > 0) {
        products = products.filter((p) => p.rating != null && p.rating >= params.minRating!);
      }
      if (params.category && params.category.trim()) {
        const c = params.category.toLowerCase().trim();
        products = products.filter((p) => p.category?.toLowerCase().includes(c));
      }
      products = products.slice(0, params.limit ?? 5);

      // Cache individual products for getDetails lookups
      for (const sp of data.products) {
        yield* cache
          .set(productCacheKey(sp.asin), JSON.stringify(sp), CACHE_TTL_SECONDS)
          .pipe(Effect.catchAll(() => Effect.void));
      }
      // Cache search results
      yield* cache
        .set(
          searchCacheKey(params.query),
          JSON.stringify(data),
          CACHE_TTL_SECONDS,
        )
        .pipe(Effect.catchAll(() => Effect.void));

      logger.debug(
        {
          query: params.query,
          total: data.total,
          returned: products.length,
          execMs: data.executionTime,
        },
        "Scraping search complete",
      );
      return { products, totalResults: data.total, query: params.query };
    });

  const getDetails = (
    productId: string,
  ): Effect.Effect<
    ProductDetail,
    ProductNotFound | ScrapingServiceUnavailable
  > =>
    Effect.gen(function* () {
      // Try cache first
      const cached = yield* cache.get(productCacheKey(productId)).pipe(
        Effect.map((raw) => JSON.parse(raw) as ScrapingProduct),
        Effect.catchAll(() => Effect.succeed(null)),
      );
      if (cached) return toProductDetail(cached);

      // Cache miss — fetch from realtime detail endpoint
      const product = yield* fetchProductByAsin(productId);
      if (!product)
        return yield* Effect.fail(new ProductNotFound({ productId }));

      // Cache for future lookups
      yield* cache
        .set(
          productCacheKey(product.asin),
          JSON.stringify(product),
          CACHE_TTL_SECONDS,
        )
        .pipe(Effect.catchAll(() => Effect.void));

      return toProductDetail(product);
    });

  return { search, getDetails };
}

// ---------------------------------------------------------------------------
// Layer: requires CacheService
// ---------------------------------------------------------------------------

export const ScrapingProductServiceLive = Layer.effect(
  ProductService,
  CacheService.pipe(Effect.map((cache) => makeScrapingImpl(cache))),
);
