import type { ProductSearchResult, ProductDetail } from "../types/product.js"

// ---------------------------------------------------------------------------
// Spec types — @json-render/react flat element map format
//
// The React renderer expects:
//   { root: "elementId", elements: { "elementId": { type, props, children? } } }
// where `children` is an array of element IDs (strings), not nested objects.
// ---------------------------------------------------------------------------

interface SpecElement {
  type: string
  props: Record<string, unknown>
  children?: string[]
}

export interface Spec {
  root: string
  elements: Record<string, SpecElement>
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

/**
 * Build a ProductGrid spec from a searchProducts tool result.
 * Frontend calls this when it intercepts a `tool-result` event
 * with toolName === "searchProducts".
 */
export function buildProductGridSpec(result: ProductSearchResult): Spec {
  const elements: Record<string, SpecElement> = {}
  const childIds: string[] = []

  result.products.forEach((product, i) => {
    const id = `card-${product.id || i}`
    childIds.push(id)
    elements[id] = {
      type: "ProductCard",
      props: product as unknown as Record<string, unknown>,
    }
  })

  elements["grid"] = {
    type: "ProductGrid",
    props: {
      query: result.query,
      totalResults: result.totalResults,
    },
    children: childIds,
  }

  return { root: "grid", elements }
}

/**
 * Build a ProductDetailCard spec from a getProductDetails tool result.
 * Frontend calls this when it intercepts a `tool-result` event
 * with toolName === "getProductDetails" and result is non-null.
 */
export function buildProductDetailSpec(detail: ProductDetail): Spec {
  return {
    root: "detail",
    elements: {
      detail: {
        type: "ProductDetailCard",
        props: detail as unknown as Record<string, unknown>,
      },
    },
  }
}
