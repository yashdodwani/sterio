/**
 * @json-render/core catalog defining the rendering contract for product UI components.
 *
 * The `spec` field defines the JSON spec tree structure used at runtime.
 * Component entries use `s.zod()` to reference Zod prop schemas so the
 * catalog can generate JSON Schema, validate specs, and build LLM prompts.
 *
 * Frontend consumers import `productCatalog` to wire up `defineRegistry` +
 * `<Renderer>` without re-defining the schema.
 *
 * Note: @json-render/core@0.14.0 builder `s` methods have incorrect TS
 * signatures (wrong arity). We cast `s` to `any` in the defineSchema
 * callback. The `createCatalog` param type also resolves to `never` due
 * to a missing internal `catalog` key in the schema definition.
 */

import { defineSchema } from "@json-render/core"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Zod prop schemas (exported for re-use in spec builders / tool output parsing)
// ---------------------------------------------------------------------------

export const colorOptionSchema = z.object({
  name: z.string(),
  hex: z.string(),
})

export const productCardProps = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string(),
  images: z.array(z.string()).optional(),
  price: z.number().describe("Price in cents — component divides by 100"),
  currency: z.literal("USD"),
  sizes: z.array(z.string()),
  colors: z.array(colorOptionSchema),
  retailer: z.string(),
  product_url: z.string(),
  rating: z.number().optional(),
  reviewCount: z.number().optional(),
  brand: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
})

export const productGridProps = z.object({
  /** Search query shown as header context */
  query: z.string().describe("Search query shown as header context"),
  /** Total matching products from API */
  totalResults: z.number().describe("Total matching products from API"),
})

export const productDetailCardProps = productCardProps.extend({
  fullDescription: z.string(),
  specifications: z.record(z.string(), z.string()),
  images: z.array(z.string()),
  availability: z.enum(["in_stock", "limited", "out_of_stock"]),
})

// Inferred TypeScript types for consumers
export type ProductCardProps = z.infer<typeof productCardProps>
export type ProductGridProps = z.infer<typeof productGridProps>
export type ProductDetailCardProps = z.infer<typeof productDetailCardProps>

// ---------------------------------------------------------------------------
// Schema — defines the JSON spec tree shape + registers Zod prop schemas
//
// The builder `s` methods have incorrect TypeScript signatures in v0.14.0
// (e.g. s.array / s.ref / s.optional claim 0 args but require 1 at runtime).
// We cast `s` to `any` to use the correct runtime API.
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- v0.14.0 types require `catalog` key + wrong builder arity
const productSchema = (defineSchema as any)((s: any) => ({
  /**
   * `spec` describes the recursive spec-tree node shape used by the
   * json-render runtime to traverse and render component trees.
   */
  spec: s.object({
    type: s.string(),
    props: s.any(),
    children: s.optional(s.array(s.ref("spec"))),
  }),
  /** Registered component prop schemas — used for validation and prompting */
  ProductCard: s.zod(productCardProps),
  ProductGrid: s.zod(productGridProps),
  ProductDetailCard: s.zod(productDetailCardProps),
})) as any // eslint-disable-line @typescript-eslint/no-explicit-any

// ---------------------------------------------------------------------------
// Catalog — pairs the schema with component metadata for LLM / validation use
//
// `createCatalog` param type resolves to `never` in v0.14.0 when the schema
// definition doesn't include the library-internal `catalog` key.
// ---------------------------------------------------------------------------

export const productCatalog = productSchema.createCatalog({
  components: {
    ProductCard: {
      description:
        "Displays a single product with image, price, rating, and metadata",
    },
    ProductGrid: {
      description: "Responsive grid container for ProductCard children",
    },
    ProductDetailCard: {
      description:
        "Expanded product view with full description, specs, gallery, and availability",
    },
  },
})
