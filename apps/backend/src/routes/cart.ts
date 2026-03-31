import { OpenAPIHono, createRoute } from "@hono/zod-openapi"
import { Effect, Layer } from "effect"
import { CartService } from "../services/cart-service.js"
import type { AuthVariables } from "../middleware/auth.js"
import { runService } from "../lib/effect-utils.js"
import {
  CartItemSchema,
  CartListSchema,
  AddCartItemSchema,
  CartItemIdParamSchema,
  commonErrors,
  errorResponse,
  validationHook,
} from "../lib/openapi-schemas.js"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cartErrorToStatus(tag: string): 400 | 404 | 409 | 500 {
  if (tag === "CartItemNotFoundError") return 404
  if (tag === "CartFullError") return 400
  if (tag === "CartInvalidProductError") return 400
  if (tag === "CartDuplicateItemError") return 409
  return 500
}

// ---------------------------------------------------------------------------
// Route definitions
// ---------------------------------------------------------------------------

const security = [{ CookieAuth: [] }]

const listCartRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Cart"],
  security,
  summary: "List cart items",
  responses: {
    200: {
      content: { "application/json": { schema: CartListSchema } },
      description: "User's cart items",
    },
    ...commonErrors,
  },
})

const addCartItemRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Cart"],
  security,
  summary: "Add item to cart",
  request: {
    body: {
      content: { "application/json": { schema: AddCartItemSchema } },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: CartItemSchema } },
      description: "Item added to cart",
    },
    ...errorResponse(400, "Cart is full (max 10 items)"),
    ...errorResponse(409, "Item variant already in cart"),
    ...commonErrors,
  },
})

const removeCartItemRoute = createRoute({
  method: "delete",
  path: "/{itemId}",
  tags: ["Cart"],
  security,
  summary: "Remove item from cart",
  request: { params: CartItemIdParamSchema },
  responses: {
    204: { description: "Item removed" },
    ...errorResponse(404, "Cart item not found"),
    ...commonErrors,
  },
})

// ---------------------------------------------------------------------------
// Route factory
// ---------------------------------------------------------------------------

export function createCartRoutes(layer: Layer.Layer<CartService>) {
  const app = new OpenAPIHono<{ Variables: AuthVariables }>({
    defaultHook: validationHook,
  })

  app.openapi(listCartRoute, async (c) => {
    const userId = c.get("userId")
    const result = await runService(
      CartService.pipe(
        Effect.flatMap((s) => s.listItems(userId)),
        Effect.provide(layer),
      ),
    )
    if (result._tag === "Left") {
      const err = result.left as { _tag: string; message?: string }
      return c.json(
        { error: err.message ?? "Failed to list cart", code: err._tag },
        cartErrorToStatus(err._tag),
      ) as never
    }
    return c.json(
      {
        items: result.right.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
        })),
      } as any,
      200,
    )
  })

  app.openapi(addCartItemRoute, async (c) => {
    const userId = c.get("userId")
    const data = c.req.valid("json")
    const result = await runService(
      CartService.pipe(
        Effect.flatMap((s) => s.addItem(userId, data)),
        Effect.provide(layer),
      ),
    )
    if (result._tag === "Left") {
      const err = result.left as { _tag: string; message?: string }
      return c.json(
        { error: err.message ?? "Failed to add item", code: err._tag },
        cartErrorToStatus(err._tag),
      ) as never
    }
    const item = result.right
    return c.json(
      { ...item, createdAt: item.createdAt.toISOString() } as any,
      201,
    )
  })

  app.openapi(removeCartItemRoute, async (c) => {
    const userId = c.get("userId")
    const { itemId } = c.req.valid("param")
    const result = await runService(
      CartService.pipe(
        Effect.flatMap((s) => s.removeItem(userId, itemId)),
        Effect.provide(layer),
      ),
    )
    if (result._tag === "Left") {
      const err = result.left as { _tag: string; message?: string }
      return c.json(
        { error: err.message ?? "Cart item not found", code: err._tag },
        cartErrorToStatus(err._tag),
      ) as never
    }
    return c.body(null, 204)
  })

  return app
}
