import { Context, Effect } from "effect"
import type {
  DatabaseError,
  CartItemNotFoundError,
  CheckoutNoWalletError,
  CheckoutMissingAddressError,
  InsufficientFundsError,
  CheckoutOrderCreationError,
  CheckoutPaymentError,
} from "../lib/errors.js"

export interface CheckoutResult {
  orderId: string
  crossmintOrderId: string
  phase: string
  transactionId: string
  walletAddress: string
}

export interface CheckoutServiceShape {
  checkout(userId: string, cartItemId: string): Effect.Effect<
    CheckoutResult,
    | CartItemNotFoundError
    | CheckoutNoWalletError
    | CheckoutMissingAddressError
    | InsufficientFundsError
    | CheckoutOrderCreationError
    | CheckoutPaymentError
    | DatabaseError
  >
}

export class CheckoutService extends Context.Tag("CheckoutService")<
  CheckoutService,
  CheckoutServiceShape
>() {}
