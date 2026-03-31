import { Effect, Layer } from "effect"
import { eq, desc, sql, and } from "drizzle-orm"
import { db } from "../db/client.js"
import { orders } from "../db/schema/orders.js"
import {
  DatabaseError,
  OrderNotFoundError,
} from "../lib/errors.js"
import { getCrossmintOrder } from "../lib/crossmint-client.js"
import { OrderService } from "./order-service.js"
import type { OrderServiceShape, OrderSummary, ListOrdersParams } from "./order-service.js"

const dbError = (cause: unknown) => new DatabaseError({ cause })

function mapCrossmintOrder(
  localOrderId: string,
  crossmintOrderId: string,
  orderType: string,
  crossmintOrder: {
    phase: string
    lineItems?: unknown[]
    payment?: { status?: string; currency?: string }
    quote?: { totalPrice?: { amount: string; currency: string } }
  },
  createdAt: string
): OrderSummary {
  return {
    orderId: localOrderId,
    crossmintOrderId,
    type: orderType,
    phase: crossmintOrder.phase,
    lineItems: crossmintOrder.lineItems ?? [],
    payment: {
      status: crossmintOrder.payment?.status ?? "unknown",
      currency: crossmintOrder.payment?.currency ?? "usdc",
    },
    quote: crossmintOrder.quote
      ? { totalPrice: crossmintOrder.quote.totalPrice }
      : undefined,
    createdAt,
  }
}

const impl: OrderServiceShape = {
  listOrders: (userId, params?: ListOrdersParams) =>
    Effect.gen(function* () {
      const page = Math.max(1, params?.page ?? 1)
      const limit = Math.min(100, Math.max(1, params?.limit ?? 20))
      const offset = (page - 1) * limit

      // Build where clause — filter by type in DB (it's a local column)
      const whereConditions = params?.type
        ? and(eq(orders.userId, userId), eq(orders.type, params.type))
        : eq(orders.userId, userId)

      // Run COUNT and SELECT in parallel (no data dependency)
      const [totalRows, localOrders] = yield* Effect.all([
        Effect.tryPromise({
          try: () =>
            db
              .select({ count: sql<number>`count(*)::int` })
              .from(orders)
              .where(whereConditions)
              .then((rows) => rows[0]?.count ?? 0),
          catch: dbError,
        }),
        Effect.tryPromise({
          try: () =>
            db
              .select()
              .from(orders)
              .where(whereConditions)
              .orderBy(desc(orders.createdAt))
              .limit(limit)
              .offset(offset),
          catch: dbError,
        }),
      ], { concurrency: "unbounded" })

      // Fetch Crossmint order details in parallel (max 5 concurrent)
      // Deposit orders have no crossmintOrderId — return local data only
      const results: OrderSummary[] = yield* Effect.all(
        localOrders.map((local) => {
          if (!local.crossmintOrderId) {
            return Effect.succeed({
              orderId: local.id,
              crossmintOrderId: "",
              type: local.type,
              phase: "funded",
              lineItems: [],
              payment: { status: "funded", currency: "usdc" },
              createdAt: local.createdAt.toISOString(),
            } satisfies OrderSummary)
          }
          return getCrossmintOrder(local.crossmintOrderId).pipe(
            Effect.map((crossmintOrder) =>
              mapCrossmintOrder(
                local.id, local.crossmintOrderId!, local.type,
                crossmintOrder, local.createdAt.toISOString()
              )
            ),
            Effect.catchAll(() =>
              Effect.succeed({
                orderId: local.id,
                crossmintOrderId: local.crossmintOrderId ?? "",
                type: local.type,
                phase: "unknown",
                lineItems: [],
                payment: { status: "unknown", currency: "usdc" },
                createdAt: local.createdAt.toISOString(),
              } satisfies OrderSummary)
            ),
          )
        }),
        { concurrency: 5 },
      )

      // Apply post-fetch filters (phase/status come from Crossmint, not DB)
      let filtered = results
      if (params?.phase) {
        filtered = filtered.filter((o) => o.phase === params.phase)
      }
      if (params?.status) {
        filtered = filtered.filter((o) => o.payment.status === params.status)
      }

      const hasPostFilters = !!(params?.phase || params?.status)
      return {
        orders: filtered,
        total: hasPostFilters ? filtered.length : totalRows,
        page,
        limit,
      }
    }),

  getOrder: (userId, orderId) =>
    Effect.gen(function* () {
      const local = yield* Effect.tryPromise({
        try: () =>
          db
            .select()
            .from(orders)
            .where(eq(orders.id, orderId))
            .then((rows) => rows[0] ?? null),
        catch: dbError,
      })

      if (!local || local.userId !== userId) {
        return yield* Effect.fail(new OrderNotFoundError({ orderId }))
      }

      if (!local.crossmintOrderId) {
        return {
          orderId: local.id,
          crossmintOrderId: "",
          type: local.type,
          phase: "funded",
          lineItems: [],
          payment: { status: "funded", currency: "usdc" },
          createdAt: local.createdAt.toISOString(),
        }
      }

      const crossmintOrder = yield* getCrossmintOrder(local.crossmintOrderId)

      return mapCrossmintOrder(
        local.id,
        local.crossmintOrderId,
        local.type,
        crossmintOrder,
        local.createdAt.toISOString()
      )
    }),
}

export const OrderServiceLive = Layer.succeed(OrderService, impl)
