import type { Context } from "hono"
import { HTTPException } from "hono/http-exception"
import {
  ValidationError,
  ProductNotFound,
  SessionNotFound,
  SessionOwnershipError,
  AIServiceError,
  ScrapingServiceUnavailable,
  DatabaseError,
  CacheError,
} from "../lib/errors.js"

type ErrorResponse = { error: string; code: string }

export function errorHandler(err: Error, c: Context) {
  if (err instanceof HTTPException) {
    return c.json<ErrorResponse>(
      { error: err.message, code: "HTTP_ERROR" },
      err.status
    )
  }

  if (err instanceof ValidationError) {
    return c.json<ErrorResponse>(
      { error: err.message, code: "VALIDATION_ERROR" },
      400
    )
  }

  if (err instanceof ProductNotFound) {
    return c.json<ErrorResponse>(
      { error: "Product not found", code: "PRODUCT_NOT_FOUND" },
      404
    )
  }

  if (err instanceof SessionNotFound) {
    return c.json<ErrorResponse>(
      { error: "Session not found", code: "SESSION_NOT_FOUND" },
      404
    )
  }

  if (err instanceof SessionOwnershipError) {
    return c.json<ErrorResponse>(
      { error: "Forbidden", code: "SESSION_OWNERSHIP_ERROR" },
      403
    )
  }

  if (err instanceof AIServiceError) {
    return c.json<ErrorResponse>(
      { error: "AI service error", code: "AI_SERVICE_ERROR" },
      502
    )
  }

  if (err instanceof ScrapingServiceUnavailable) {
    return c.json<ErrorResponse>(
      { error: "Scraping service unavailable", code: "SCRAPING_SERVICE_UNAVAILABLE" },
      503
    )
  }

  if (err instanceof DatabaseError) {
    return c.json<ErrorResponse>(
      { error: "Database error", code: "DATABASE_ERROR" },
      500
    )
  }

  if (err instanceof CacheError) {
    console.error("[CacheError]", err.cause)
    return c.json<ErrorResponse>(
      { error: "Cache error", code: "CACHE_ERROR" },
      500
    )
  }

  // Unknown errors — never expose internals
  console.error("[UnhandledError]", err)
  return c.json<ErrorResponse>(
    { error: "Internal server error", code: "INTERNAL_ERROR" },
    500
  )
}
