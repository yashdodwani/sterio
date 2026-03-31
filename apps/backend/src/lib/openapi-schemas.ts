import { z } from "@hono/zod-openapi"

// ─── Reusable schemas ────────────────────────────────────────────────────────

export const ErrorSchema = z
  .object({
    error: z.string().openapi({ example: "Error message" }),
    code: z.string().openapi({ example: "ERROR_CODE" }),
  })
  .openapi("Error")

export const ChatSessionSchema = z
  .object({
    id: z.string().uuid().openapi({ example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" }),
    userId: z.string().uuid().openapi({ example: "f0e1d2c3-b4a5-6789-0abc-def123456789" }),
    title: z.string().nullable().openapi({ example: "Shopping for sneakers" }),
    createdAt: z.string().openapi({ example: "2026-03-16T10:00:00.000Z" }),
    updatedAt: z.string().openapi({ example: "2026-03-16T10:05:00.000Z" }),
  })
  .openapi("ChatSession")

export const ChatMessageSchema = z
  .object({
    id: z.string().uuid().openapi({ example: "b2c3d4e5-f6a7-8901-bcde-f12345678901" }),
    sessionId: z.string().uuid().openapi({ example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" }),
    msgId: z.string().nullable().openapi({ example: "msg_abc123" }),
    role: z.string().openapi({ example: "user" }),
    parts: z.unknown().openapi({ example: [{ type: "text", text: "What running shoes do you recommend?" }] }),
    createdAt: z.string().openapi({ example: "2026-03-16T10:01:00.000Z" }),
  })
  .openapi("ChatMessage")

export const SessionWithMessagesSchema = ChatSessionSchema.extend({
  messages: z.array(ChatMessageSchema),
}).openapi("SessionWithMessages")

export const SessionListSchema = z
  .object({
    sessions: z.array(ChatSessionSchema),
    total: z.number().int().openapi({ example: 5 }),
  })
  .openapi("SessionList")

export const UserProfileSchema = z
  .object({
    userId: z.string().uuid().openapi({ example: "f0e1d2c3-b4a5-6789-0abc-def123456789" }),
    email: z.string().email().openapi({ example: "user@example.com" }),
    walletAddress: z.string().nullable().openapi({ example: "0xDeAdBeEf00000000000000000000000000000001" }),
    walletStatus: z.string().openapi({ example: "active" }),
    onboardingStep: z.number().int().openapi({ example: 0 }),
  })
  .openapi("UserProfile")

// ─── Param schemas ───────────────────────────────────────────────────────────

export const SessionIdParamSchema = z.object({
  id: z.string().uuid().openapi({
    param: { name: "id", in: "path" },
    example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  }),
})

// ─── Error responses (reusable) ──────────────────────────────────────────────

export const errorResponse = (status: number, description: string) => ({
  [status]: {
    content: { "application/json": { schema: ErrorSchema } },
    description,
  },
})

export const commonErrors = {
  ...errorResponse(401, "Unauthorized — missing or invalid JWT"),
  ...errorResponse(500, "Internal server error"),
}

// ─── Onboarding schemas ─────────────────────────────────────────────────────

export const ALLOWED_COUNTRIES = ["US", "GB", "AU", "CA", "DE", "FR", "JP", "SG"] as const

export const TOPS_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL"] as const

export const OnboardingStep1Schema = z
  .object({
    displayName: z.string().min(1).max(100).openapi({ example: "Ben" }),
  })
  .openapi("OnboardingStep1")

export const OnboardingStep2Schema = z
  .object({
    firstName: z.string().min(1).max(50).openapi({ example: "Ben" }),
    lastName: z.string().min(1).max(50).openapi({ example: "Smith" }),
    street: z.string().min(5).max(200).openapi({ example: "123 Main St" }),
    apt: z.string().max(50).optional().openapi({ example: "Apt 5B" }),
    country: z.enum(ALLOWED_COUNTRIES).openapi({ example: "US" }),
    city: z.string().min(2).max(100).openapi({ example: "New York" }),
    state: z.string().max(100).optional().openapi({ example: "NY" }),
    zip: z.string().min(3).max(20).openapi({ example: "10001" }),
  })
  .openapi("OnboardingStep2")

export const OnboardingStep3Schema = z
  .object({
    topsSize: z.enum(TOPS_SIZES).openapi({ example: "M" }),
    bottomsSize: z.string().min(1).max(10).openapi({ example: "32" }),
    footwearSize: z.string().min(1).max(10).openapi({ example: "10" }),
  })
  .openapi("OnboardingStep3")

export const OnboardingStepResponseSchema = z
  .object({
    success: z.boolean().openapi({ example: true }),
    step: z.number().int().openapi({ example: 1 }),
  })
  .openapi("OnboardingStepResponse")

export const OnboardingStatusSchema = z
  .object({
    step: z.number().int().openapi({ example: 0 }),
    completed: z.boolean().openapi({ example: false }),
  })
  .openapi("OnboardingStatus")

// ─── Cart schemas ───────────────────────────────────────────────────────────

export const CartItemSchema = z
  .object({
    id: z.string().uuid().openapi({ example: "c1d2e3f4-a5b6-7890-cdef-123456789012" }),
    userId: z.string().uuid().openapi({ example: "f0e1d2c3-b4a5-6789-0abc-def123456789" }),
    productId: z.string().openapi({ example: "B0CXYZ1234" }),
    productName: z.string().openapi({ example: "Nike Air Max 90" }),
    price: z.number().int().openapi({ example: 14999 }),
    image: z.string().url().openapi({ example: "https://example.com/shoe.jpg" }),
    size: z.string().openapi({ example: "10" }),
    color: z.string().openapi({ example: "Black" }),
    productUrl: z.string().url().openapi({ example: "https://amazon.com/dp/B0CXYZ1234" }),
    retailer: z.string().openapi({ example: "Amazon" }),
    createdAt: z.string().openapi({ example: "2026-03-17T12:00:00.000Z" }),
  })
  .openapi("CartItem")

export const CartListSchema = z
  .object({
    items: z.array(CartItemSchema),
  })
  .openapi("CartList")

export const AddCartItemSchema = z
  .object({
    productId: z.string().min(1).max(255),
    productName: z.string().min(1).max(500),
    price: z.number().int().positive(),
    image: z.string().url(),
    size: z.string().min(1).max(50),
    color: z.string().min(1).max(50),
    productUrl: z.string().url(),
    retailer: z.string().min(1).max(255),
  })
  .openapi("AddCartItem")

export const CartItemIdParamSchema = z.object({
  itemId: z.string().uuid().openapi({
    param: { name: "itemId", in: "path" },
    example: "c1d2e3f4-a5b6-7890-cdef-123456789012",
  }),
})

// ─── Checkout schemas ──────────────────────────────────────────────────────

export const CheckoutRequestSchema = z
  .object({
    cartItemId: z.string().uuid(),
  })
  .openapi("CheckoutRequest")

export const CheckoutResponseSchema = z
  .object({
    orderId: z.string().uuid().openapi({ example: "d1e2f3a4-b5c6-7890-defg-234567890123" }),
    crossmintOrderId: z.string().openapi({ example: "ed34a579-7fbc-4509-b8d8-9e61954cd555" }),
    phase: z.string().openapi({ example: "awaiting-approval" }),
    transactionId: z.string().openapi({ example: "tx-uuid-123" }),
    walletAddress: z.string().openapi({ example: "0xDeAdBeEf00000000000000000000000000000001" }),
  })
  .openapi("CheckoutResponse")

// ─── Order schemas ─────────────────────────────────────────────────────────

export const OrderSummarySchema = z
  .object({
    orderId: z.string().uuid().openapi({ example: "d1e2f3a4-b5c6-7890-defg-234567890123" }),
    crossmintOrderId: z.string().openapi({ example: "ed34a579-7fbc-4509-b8d8-9e61954cd555" }),
    type: z.string().openapi({ example: "checkout" }),
    phase: z.string().openapi({ example: "completed" }),
    lineItems: z.array(z.unknown()),
    payment: z.object({
      status: z.string().openapi({ example: "completed" }),
      currency: z.string().openapi({ example: "usdc" }),
    }),
    quote: z
      .object({
        totalPrice: z
          .object({
            amount: z.string().openapi({ example: "29.99" }),
            currency: z.string().openapi({ example: "usd" }),
          })
          .optional(),
      })
      .optional(),
    createdAt: z.string().openapi({ example: "2026-03-17T12:00:00.000Z" }),
  })
  .openapi("OrderSummary")

export const OrderListSchema = z
  .object({
    orders: z.array(OrderSummarySchema),
    total: z.number().int().openapi({ example: 10 }),
    page: z.number().int().openapi({ example: 1 }),
    limit: z.number().int().openapi({ example: 20 }),
  })
  .openapi("OrderList")

export const OrderListQuerySchema = z.object({
  page: z.string().optional().openapi({ example: "1", param: { name: "page", in: "query" } }),
  limit: z.string().optional().openapi({ example: "20", param: { name: "limit", in: "query" } }),
  type: z.string().optional().openapi({ example: "checkout", param: { name: "type", in: "query" } }),
  phase: z.string().optional().openapi({ example: "completed", param: { name: "phase", in: "query" } }),
  status: z.string().optional().openapi({ example: "completed", param: { name: "status", in: "query" } }),
})

export const OrderIdParamSchema = z.object({
  orderId: z.string().uuid().openapi({
    param: { name: "orderId", in: "path" },
    example: "d1e2f3a4-b5c6-7890-defg-234567890123",
  }),
})

// ─── Deposit schemas ────────────────────────────────────────────────────────

export const UserIdParamSchema = z.object({
  userId: z.string().uuid().openapi({
    param: { name: "userId", in: "path" },
    example: "f0e1d2c3-b4a5-6789-0abc-def123456789",
  }),
})

export const DepositParamsSchema = z.object({
  userId: z.string().uuid().openapi({
    param: { name: "userId", in: "path" },
    example: "f0e1d2c3-b4a5-6789-0abc-def123456789",
  }),
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/).openapi({
    param: { name: "address", in: "path" },
    example: "0x1234567890abcdef1234567890abcdef12345678",
    description: "User EVM wallet address",
  }),
})

export const DepositConfirmRequestSchema = z
  .object({
    amountPAS: z.number().positive().openapi({ example: 100 }),
    transactionHash: z.string().min(1).openapi({ example: "0xabc123...polkadot_tx_hash" }),
  })
  .openapi("DepositConfirmRequest")

export const DepositConfirmResponseSchema = z
  .object({
    orderId: z.string().uuid().openapi({ example: "d1e2f3a4-b5c6-7890-defg-234567890123" }),
    amountUSDC: z.string().openapi({ example: "10.00" }),
    crossmintFundingStatus: z.string().openapi({ example: "funded" }),
  })
  .openapi("DepositConfirmResponse")

// ─── Shared validation hook ──────────────────────────────────────────────────

/**
 * Default hook for OpenAPIHono — returns consistent `{ error, code }` on validation failure.
 * Pass as `defaultHook` to `new OpenAPIHono({ defaultHook: validationHook })`.
 */
export const validationHook = (result: { success: boolean; error?: unknown }, c: any) => {
  if (!result.success) {
    return c.json({ error: "Validation error", code: "VALIDATION_ERROR" }, 400)
  }
}
