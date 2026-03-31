import { Context, Effect } from "effect"
import type {
  DatabaseError,
  OrderNotFoundError,
  CheckoutOrderCreationError,
} from "../lib/errors.js"

export interface OrderSummary {
  orderId: string
  crossmintOrderId: string
  type: string
  phase: string
  lineItems: unknown[]
  payment: { status: string; currency: string }
  quote?: { totalPrice?: { amount: string; currency: string } }
  createdAt: string
}

export interface ListOrdersParams {
  page?: number
  limit?: number
  type?: string
  phase?: string
  status?: string
}

export interface PaginatedOrders {
  orders: OrderSummary[]
  total: number
  page: number
  limit: number
}

export interface OrderServiceShape {
  listOrders(userId: string, params?: ListOrdersParams): Effect.Effect<
    PaginatedOrders,
    DatabaseError | CheckoutOrderCreationError
  >

  getOrder(userId: string, orderId: string): Effect.Effect<
    OrderSummary,
    OrderNotFoundError | DatabaseError | CheckoutOrderCreationError
  >
}

export class OrderService extends Context.Tag("OrderService")<
  OrderService,
  OrderServiceShape
>() {}
