import { OpenAPIHono, createRoute } from "@hono/zod-openapi"
import { Effect, Layer } from "effect"
import { CheckoutService } from "../services/checkout-service.js"
import type { AuthVariables } from "../middleware/auth.js"
import { runService } from "../lib/effect-utils.js"
import {
  CheckoutRequestSchema,
  CheckoutResponseSchema,
  commonErrors,
  errorResponse,
  validationHook,
} from "../lib/openapi-schemas.js"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function checkoutErrorToStatus(tag: string): 400 | 404 | 422 | 502 | 500 {
  if (tag === "CartItemNotFoundError") return 404
  if (tag === "CheckoutNoWalletError") return 400
  if (tag === "CheckoutMissingAddressError") return 400
  if (tag === "InsufficientFundsError") return 422
  if (tag === "CheckoutOrderCreationError") return 502
  if (tag === "CheckoutPaymentError") return 502
  return 500
}

// ---------------------------------------------------------------------------
// Route definitions
// ---------------------------------------------------------------------------

const security = [{ CookieAuth: [] }]

const checkoutRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Checkout"],
  security,
  summary: "Checkout a single cart item via Crossmint",
  request: {
    body: {
      content: { "application/json": { schema: CheckoutRequestSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: CheckoutResponseSchema } },
      description: "Order created and payment initiated",
    },
    ...errorResponse(400, "Missing wallet or address"),
    ...errorResponse(404, "Cart item not found"),
    ...errorResponse(422, "Insufficient USDC funds"),
    ...errorResponse(502, "Crossmint API error"),
    ...commonErrors,
  },
})

// ---------------------------------------------------------------------------
// Route factory
// ---------------------------------------------------------------------------

export function createCheckoutRoutes(layer: Layer.Layer<CheckoutService>) {
  const app = new OpenAPIHono<{ Variables: AuthVariables }>({
    defaultHook: validationHook,
  })

  app.openapi(checkoutRoute, async (c) => {
    const userId = c.get("userId")
    const { cartItemId } = c.req.valid("json")
    const result = await runService(
      CheckoutService.pipe(
        Effect.flatMap((s) => s.checkout(userId, cartItemId)),
        Effect.provide(layer),
      ),
    )
    if (result._tag === "Left") {
      const err = result.left as { _tag: string; message?: string }
      return c.json(
        { error: err.message ?? "Checkout failed", code: err._tag },
        checkoutErrorToStatus(err._tag),
      ) as never
    }
    return c.json(result.right as any, 201)
  })

  return app
}
