import { Effect, Layer } from "effect"
import { tool, type ToolSet } from "ai"
import { z } from "zod"
import { ProductService } from "./product-service.js"
import type { ProductDetail, ProductSearchResult } from "../types/product.js"

// ---------------------------------------------------------------------------
// Parameter schemas
// ---------------------------------------------------------------------------

const searchParamsSchema = z.object({
  query: z.string().describe("Search query — include all relevant keywords (brand, product type, etc.)"),
  category: z.string().optional().describe("ONLY if user explicitly asks. Must match Amazon categories exactly (e.g., 'Wrist Watches' not 'Watches')"),
  brand: z.string().optional().describe("ONLY if user explicitly mentions a brand name"),
  minPrice: z.number().optional().describe("Minimum price in USD. ONLY if user specifies a minimum"),
  maxPrice: z.number().optional().describe("Maximum price in USD. Set from user's budget"),
  minRating: z.number().min(0).max(5).optional().describe("ONLY if user explicitly asks for highly-rated products"),
  page: z.number().int().min(1).optional().describe("Page number for pagination (default 1)"),
  limit: z.number().int().min(1).max(20).optional().describe("Number of results (default 5, max 20)"),
})

const detailParamsSchema = z.object({
  productId: z.string().describe("Product ID to retrieve details for"),
})

type SearchToolParams = z.infer<typeof searchParamsSchema>
type DetailToolParams = z.infer<typeof detailParamsSchema>

// ---------------------------------------------------------------------------
// Factory: bind product tools to a specific ProductService layer
// ---------------------------------------------------------------------------

export function makeProductTools(layer: Layer.Layer<ProductService>): ToolSet {
  /**
   * Run an Effect requiring ProductService; typed errors become defects
   * so the AI SDK execute handler receives a rejected Promise on failure.
   */
  const run = <A>(effect: Effect.Effect<A, never, ProductService>): Promise<A> => {
    // Effect.provide narrows the requirement to never — cast needed due to generic inference limit
    const provided = effect.pipe(Effect.provide(layer)) as unknown as Effect.Effect<A, never, never>
    return Effect.runPromise(provided)
  }

  const tools: ToolSet = {
    searchProducts: tool({
      description:
        "Search for products matching the user's requirements. Supports filtering by " +
        "brand, category, price range, and rating. Supports pagination with page and limit.",
      inputSchema: searchParamsSchema,
      execute: async (params: SearchToolParams): Promise<ProductSearchResult> =>
        run(
          ProductService.pipe(
            Effect.flatMap((s) => s.search(params)),
            Effect.orDie
          )
        ),
    }),
    getProductDetails: tool({
      description:
        "Get detailed information about a specific product by its ID. Use this when the user wants " +
        "more details about a product returned from searchProducts.",
      inputSchema: detailParamsSchema,
      execute: async ({ productId }: DetailToolParams): Promise<ProductDetail | null> =>
        run(
          ProductService.pipe(
            Effect.flatMap((s) => s.getDetails(productId)),
            Effect.catchTag("ProductNotFound", () => Effect.succeed(null)),
            Effect.orDie
          )
        ),
    }),
  }

  return tools
}
