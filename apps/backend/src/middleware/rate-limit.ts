import { createMiddleware } from "hono/factory"
import { env } from "../lib/env.js"
import type { AuthVariables } from "./auth.js"

// ---------------------------------------------------------------------------
// In-memory sliding-window rate limiter (per userId, resets every minute)
// ---------------------------------------------------------------------------

const store = new Map<string, { count: number; resetAt: number }>()

export const rateLimitMiddleware = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const userId = c.get("userId")
    const now = Date.now()
    const windowMs = 60_000

    let entry = store.get(userId)
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs }
      store.set(userId, entry)
    }

    entry.count++

    if (entry.count > env.RATE_LIMIT_RPM) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
      c.header("Retry-After", String(retryAfter))
      return c.json(
        { error: "Rate limit exceeded", code: "RATE_LIMIT_EXCEEDED" },
        429
      )
    }

    await next()
  }
)
