import { Data } from "effect"

/**
 * Raised when a product lookup returns no result.
 */
export class ProductNotFound extends Data.TaggedError("ProductNotFound")<{
  productId: string
}> {}

/**
 * Raised when the external scraping service is down or unreachable.
 */
export class ScrapingServiceUnavailable extends Data.TaggedError(
  "ScrapingServiceUnavailable"
)<{
  cause?: unknown
}> {}

/**
 * Raised when a chat session cannot be found in storage.
 */
export class SessionNotFound extends Data.TaggedError("SessionNotFound")<{
  sessionId: string
}> {}

/**
 * Raised when the AI (LLM) provider returns an error or times out.
 */
export class AIServiceError extends Data.TaggedError("AIServiceError")<{
  cause?: unknown
}> {}

/**
 * Raised on unrecoverable database operation failures.
 */
export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  cause?: unknown
}> {
  get message() {
    return typeof this.cause === "string" ? this.cause : "Database operation failed"
  }
}

/**
 * Raised when input fails schema or business-rule validation.
 */
export class ValidationError extends Data.TaggedError("ValidationError")<{
  message: string
}> {}

/**
 * Raised on unexpected cache read/write failures.
 */
export class CacheError extends Data.TaggedError("CacheError")<{
  cause?: unknown
}> {}

/**
 * Raised when a cache key lookup yields no result (cache miss).
 */
export class CacheNotFound extends Data.TaggedError("CacheNotFound")<{
  key: string
}> {}

/**
 * Raised when Crossmint JWT validation fails or session cannot be established.
 */
export class AuthenticationError extends Data.TaggedError(
  "AuthenticationError"
)<{
  cause?: unknown
}> {}

/**
 * Raised when the authenticated user does not own the requested session.
 */
export class SessionOwnershipError extends Data.TaggedError(
  "SessionOwnershipError"
)<{
  sessionId: string
}> {}

/**
 * Raised when Crossmint wallet provisioning fails or times out.
 */
export class WalletProvisioningError extends Data.TaggedError(
  "WalletProvisioningError"
)<{
  cause?: unknown
}> {}

/**
 * Raised when user's cart already has 5 items.
 */
export class CartFullError extends Data.TaggedError("CartFullError")<{
  userId: string
}> {
  get message() {
    return "Cart is full"
  }
}

/**
 * Raised when the same product+size+color variant is already in cart.
 */
export class CartDuplicateItemError extends Data.TaggedError("CartDuplicateItemError")<{
  productId: string
  size: string
  color: string
}> {
  get message() {
    return `Product ${this.productId} (${this.size}/${this.color}) is already in cart`
  }
}

/**
 * Raised when a product ASIN is not found in Redis cache (never searched or expired).
 */
export class CartInvalidProductError extends Data.TaggedError("CartInvalidProductError")<{
  productId: string
}> {
  get message() {
    return `Product ${this.productId} not found – search for it first`
  }
}

/**
 * Raised when a cart item is not found or not owned by user.
 */
export class CartItemNotFoundError extends Data.TaggedError("CartItemNotFoundError")<{
  itemId: string
}> {
  get message() {
    return `Cart item ${this.itemId} not found`
  }
}

/**
 * Raised when user has no Crossmint wallet provisioned.
 */
export class CheckoutNoWalletError extends Data.TaggedError("CheckoutNoWalletError")<{
  userId: string
}> {
  get message() {
    return "User has no wallet provisioned"
  }
}

/**
 * Raised when user profile is missing required shipping address fields.
 */
export class CheckoutMissingAddressError extends Data.TaggedError("CheckoutMissingAddressError")<{
  userId: string
}> {
  get message() {
    return "User is missing required shipping address"
  }
}

/**
 * Raised when user's wallet has insufficient USDC for the order.
 */
export class InsufficientFundsError extends Data.TaggedError("InsufficientFundsError")<{
  orderId?: string
}> {
  get message() {
    return "Insufficient USDC balance to complete checkout"
  }
}

/**
 * Raised when Crossmint order creation API fails.
 */
export class CheckoutOrderCreationError extends Data.TaggedError("CheckoutOrderCreationError")<{
  cause?: unknown
}> {
  get message() {
    const msg =
      this.cause instanceof Error
        ? this.cause.message
        : typeof this.cause === "string"
          ? this.cause
          : undefined
    return msg || "Failed to create Crossmint order"
  }
}

/**
 * Raised when Crossmint transaction signing fails.
 */
export class CheckoutPaymentError extends Data.TaggedError("CheckoutPaymentError")<{
  cause?: unknown
}> {
  get message() {
    return "Failed to sign Crossmint transaction"
  }
}

/**
 * Raised when an order is not found in local DB or not owned by user.
 */
export class OrderNotFoundError extends Data.TaggedError("OrderNotFoundError")<{
  orderId: string
}> {
  get message() {
    return `Order ${this.orderId} not found`
  }
}

/**
 * Raised when a deposit with the same Polkadot tx hash already exists.
 */
export class DepositDuplicateError extends Data.TaggedError("DepositDuplicateError")<{
  transactionHash: string
}> {
  get message() {
    return `Deposit already processed for tx ${this.transactionHash}`
  }
}

/**
 * Raised when Crossmint wallet funding fails.
 */
export class DepositFundingError extends Data.TaggedError("DepositFundingError")<{
  cause?: unknown
}> {
  get message() {
    return "Failed to fund wallet"
  }
}

/**
 * Raised when userId + walletAddress pair is not found in users table.
 */
export class DepositUserNotFoundError extends Data.TaggedError("DepositUserNotFoundError")<{
  userId: string
  address: string
}> {
  get message() {
    return "User not found or address mismatch"
  }
}
