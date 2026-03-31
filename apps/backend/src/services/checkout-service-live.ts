import { Effect, Layer } from "effect"
import { eq, and } from "drizzle-orm"
import { db } from "../db/client.js"
import { users } from "../db/schema/users.js"
import { cartItems } from "../db/schema/cart-items.js"
import { orders } from "../db/schema/orders.js"
import {
  DatabaseError,
  CartItemNotFoundError,
  CheckoutNoWalletError,
  CheckoutMissingAddressError,
  InsufficientFundsError,
} from "../lib/errors.js"
import {
  createCrossmintOrder,
  createWalletTransaction,
} from "../lib/crossmint-client.js"
import { CheckoutService } from "./checkout-service.js"
import type { CheckoutServiceShape } from "./checkout-service.js"
import logger from "../lib/logger.js"

const dbError = (cause: unknown) => {
  logger.error({ cause }, "Checkout DB operation failed")
  return new DatabaseError({ cause })
}

const impl: CheckoutServiceShape = {
  checkout: (userId, cartItemId) =>
    Effect.gen(function* () {
      // 1. Fetch user
      const user = yield* Effect.tryPromise({
        try: () =>
          db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .then((rows) => rows[0] ?? null),
        catch: dbError,
      })

      if (!user) {
        return yield* Effect.fail(new DatabaseError({ cause: "User not found" }))
      }

      // 2. Guard: wallet
      if (!user.crossmintWalletId || !user.walletAddress) {
        return yield* Effect.fail(new CheckoutNoWalletError({ userId }))
      }

      // 3. Guard: address
      const hasAddress =
        user.firstName && user.lastName && user.street && user.city && user.zip && user.country
      if (!hasAddress) {
        return yield* Effect.fail(new CheckoutMissingAddressError({ userId }))
      }

      // 4. Fetch cart item
      const cartItem = yield* Effect.tryPromise({
        try: () =>
          db
            .select()
            .from(cartItems)
            .where(and(eq(cartItems.id, cartItemId), eq(cartItems.userId, userId)))
            .then((rows) => rows[0] ?? null),
        catch: dbError,
      })

      if (!cartItem) {
        return yield* Effect.fail(new CartItemNotFoundError({ itemId: cartItemId }))
      }

      // 5. Create Crossmint order
      const crossmintResponse = yield* createCrossmintOrder({
        email: user.email,
        physicalAddress: {
          name: `${user.firstName} ${user.lastName}`,
          line1: user.street!,
          line2: user.apt ?? undefined,
          city: user.city!,
          state: user.state ?? "",
          postalCode: user.zip!,
          country: user.country!,
        },
        payerAddress: user.walletAddress,
        lineItems: [{ productLocator: `amazon:${cartItem.productId}` }],
      })

      const crossmintOrder = crossmintResponse.order

      // 6. Check for insufficient funds
      if (crossmintOrder.payment.status === "crypto-payer-insufficient-funds") {
        return yield* Effect.fail(new InsufficientFundsError({ orderId: crossmintOrder.orderId }))
      }

      // 7. Extract serialized transaction and create wallet tx (awaiting-approval)
      const serializedTx = crossmintOrder.payment.preparation?.serializedTransaction
      if (!serializedTx) {
        logger.error({ orderId: crossmintOrder.orderId, payment: crossmintOrder.payment }, "No serialized transaction in Crossmint response")
        return yield* Effect.fail(new InsufficientFundsError({ orderId: crossmintOrder.orderId }))
      }

      const walletTx = yield* createWalletTransaction(user.walletAddress, serializedTx)

      // 8. Insert local order record
      const localOrder = yield* Effect.tryPromise({
        try: () =>
          db
            .insert(orders)
            .values({
              userId,
              type: "checkout",
              crossmintOrderId: crossmintOrder.orderId,
            })
            .returning()
            .then((rows) => rows[0]),
        catch: dbError,
      })

      // 9. Delete cart item (only after successful payment)
      yield* Effect.tryPromise({
        try: () =>
          db
            .delete(cartItems)
            .where(eq(cartItems.id, cartItemId)),
        catch: dbError,
      })

      logger.info(
        { userId, orderId: localOrder.id, crossmintOrderId: crossmintOrder.orderId },
        "Checkout order created — awaiting frontend approval"
      )

      return {
        orderId: localOrder.id,
        crossmintOrderId: crossmintOrder.orderId,
        phase: "awaiting-approval",
        transactionId: walletTx.id,
        walletAddress: user.walletAddress,
      }
    }),
}

export const CheckoutServiceLive = Layer.succeed(CheckoutService, impl)
