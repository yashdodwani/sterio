import { OpenAPIHono, createRoute } from "@hono/zod-openapi"
import { Effect, Layer } from "effect"
import { DepositService } from "../services/deposit-service.js"
import { runService } from "../lib/effect-utils.js"
import { webhookAuth } from "../middleware/webhook-auth.js"
import {
  DepositConfirmRequestSchema,
  DepositConfirmResponseSchema,
  DepositParamsSchema,
  errorResponse,
  validationHook,
} from "../lib/openapi-schemas.js"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function depositErrorToStatus(tag: string): 404 | 409 | 502 | 500 {
  if (tag === "DepositUserNotFoundError") return 404
  if (tag === "DepositDuplicateError") return 409
  if (tag === "DepositFundingError") return 502
  return 500
}

// ---------------------------------------------------------------------------
// Route definitions
// ---------------------------------------------------------------------------

const security = [{ WebhookSecret: [] }]

const confirmDepositRoute = createRoute({
  method: "post",
  path: "/{userId}/{address}/confirm",
  tags: ["Deposit"],
  security,
  summary: "Confirm PAS deposit and fund user wallet with USDC",
  request: {
    params: DepositParamsSchema,
    body: {
      content: { "application/json": { schema: DepositConfirmRequestSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: DepositConfirmResponseSchema } },
      description: "Deposit confirmed and wallet funded",
    },
    ...errorResponse(401, "Unauthorized — invalid webhook secret"),
    ...errorResponse(404, "User not found or address mismatch"),
    ...errorResponse(409, "Duplicate transaction hash"),
    ...errorResponse(502, "Crossmint funding failed"),
    ...errorResponse(500, "Internal server error"),
  },
})

// ---------------------------------------------------------------------------
// Route factory
// ---------------------------------------------------------------------------

export function createDepositRoutes(layer: Layer.Layer<DepositService>) {
  const app = new OpenAPIHono({
    defaultHook: validationHook,
  })

  // Webhook auth for all deposit routes
  app.use("*", webhookAuth)

  // Register webhook secret security scheme
  app.openAPIRegistry.registerComponent("securitySchemes", "WebhookSecret", {
    type: "apiKey",
    in: "header",
    name: "X-Webhook-Secret",
    description: "Shared secret for webhook authentication",
  })

  app.openapi(confirmDepositRoute, async (c) => {
    const { userId, address } = c.req.valid("param")
    const { amountPAS, transactionHash } = c.req.valid("json")
    const result = await runService(
      DepositService.pipe(
        Effect.flatMap((s) => s.confirmDeposit(userId, address, String(amountPAS), transactionHash)),
        Effect.provide(layer),
      ),
    )
    if (result._tag === "Left") {
      const err = result.left as { _tag: string; message?: string }
      return c.json(
        { error: err.message ?? "Deposit failed", code: err._tag },
        depositErrorToStatus(err._tag),
      ) as never
    }
    return c.json(result.right as any, 201)
  })

  return app
}
