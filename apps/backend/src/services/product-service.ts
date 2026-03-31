import { Context, Effect } from "effect"
import type { ProductDetail, ProductSearchParams, ProductSearchResult } from "../types/product.js"
import type { ProductNotFound, ScrapingServiceUnavailable } from "../lib/errors.js"

export interface ProductServiceShape {
  search(params: ProductSearchParams): Effect.Effect<ProductSearchResult, ScrapingServiceUnavailable>
  getDetails(productId: string): Effect.Effect<ProductDetail, ProductNotFound | ScrapingServiceUnavailable>
}

export class ProductService extends Context.Tag("ProductService")<
  ProductService,
  ProductServiceShape
>() {}
