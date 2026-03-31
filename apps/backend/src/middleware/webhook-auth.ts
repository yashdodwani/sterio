import { createMiddleware } from "hono/factory"
import { env } from "../lib/env.js"
import logger from "../lib/logger.js"

/**
 * Validates X-Webhook-Secret header against DEPOSIT_WEBHOOK_SECRET env var.
 * Returns 401 if missing or mismatched.
 */
export const webhookAuth = createMiddleware(async (c, next) => {
  const secret = c.req.header("X-Webhook-Secret")

  if (!env.DEPOSIT_WEBHOOK_SECRET) {
    logger.warn("DEPOSIT_WEBHOOK_SECRET not configured — rejecting webhook")
    return c.json({ error: "Webhook not configured", code: "WEBHOOK_NOT_CONFIGURED" }, 503)
  }

  if (!secret || secret !== env.DEPOSIT_WEBHOOK_SECRET) {
    logger.warn({ hasSecret: !!secret }, "Webhook auth failed — invalid secret")
    return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401)
  }

  await next()
})
