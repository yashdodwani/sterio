import { Effect, Layer } from "effect"
import { eq, desc, and, count } from "drizzle-orm"
import { db } from "../db/client.js"
import { cartItems } from "../db/schema/cart-items.js"
import {
  DatabaseError,
  CartFullError,
  CartDuplicateItemError,
  CartInvalidProductError,
  CartItemNotFoundError,
} from "../lib/errors.js"
import { CartService } from "./cart-service.js"
import type { CartServiceShape } from "./cart-service.js"
import type { CacheServiceShape } from "./cache-service.js"
import { CacheService } from "./cache-service.js"

const MAX_CART_ITEMS = 10

const dbError = (cause: unknown) => new DatabaseError({ cause })

function makeCartImpl(cache: CacheServiceShape): CartServiceShape {
  return {
    listItems: (userId) =>
      Effect.tryPromise({
        try: () =>
          db
            .select()
            .from(cartItems)
            .where(eq(cartItems.userId, userId))
            .orderBy(desc(cartItems.createdAt)),
        catch: dbError,
      }),

    addItem: (userId, data) =>
      Effect.gen(function* () {
        // Validate product exists in cache (was returned by a recent search)
        yield* cache.get(`scraping:product:${data.productId}`).pipe(
          Effect.catchTag("CacheNotFound", () =>
            Effect.fail(new CartInvalidProductError({ productId: data.productId }))
          ),
          Effect.catchTag("CacheError", () => Effect.succeed("skip")), // Redis down → allow (graceful degradation)
        )

        // Check cart size limit
        const [{ value: itemCount }] = yield* Effect.tryPromise({
        try: () =>
          db
            .select({ value: count() })
            .from(cartItems)
            .where(eq(cartItems.userId, userId)),
        catch: dbError,
      })

      if (itemCount >= MAX_CART_ITEMS) {
        return yield* Effect.fail(new CartFullError({ userId }))
      }

      // Insert — unique index on (userId, productId, size, color) catches duplicates
      const rows = yield* Effect.tryPromise({
        try: () =>
          db
            .insert(cartItems)
            .values({
              userId,
              productId: data.productId,
              productName: data.productName,
              price: data.price,
              image: data.image,
              size: data.size,
              color: data.color,
              productUrl: data.productUrl,
              retailer: data.retailer,
            })
            .returning(),
        catch: (cause: unknown) => {
          const msg = String(cause)
          if (msg.includes("unique") || msg.includes("duplicate")) {
            return new CartDuplicateItemError({
              productId: data.productId,
              size: data.size,
              color: data.color,
            })
          }
          return new DatabaseError({ cause })
        },
      })

      return rows[0]!
    }),

    removeItem: (userId, itemId) =>
      Effect.gen(function* () {
        const result = yield* Effect.tryPromise({
          try: () =>
            db
              .delete(cartItems)
              .where(and(eq(cartItems.id, itemId), eq(cartItems.userId, userId)))
              .returning({ id: cartItems.id }),
          catch: dbError,
        })

        if (result.length === 0) {
          return yield* Effect.fail(new CartItemNotFoundError({ itemId }))
        }
      }),
  }
}

export const CartServiceLive = Layer.effect(
  CartService,
  CacheService.pipe(Effect.map((cache) => makeCartImpl(cache)))
)
