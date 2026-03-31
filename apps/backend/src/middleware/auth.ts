import { createMiddleware } from "hono/factory"
import { getCookie, setCookie } from "hono/cookie"
import { eq } from "drizzle-orm"
import { crossmintAuth } from "../lib/crossmint.js"
import { db } from "../db/client.js"
import { users } from "../db/schema/users.js"
import type { User } from "../db/schema/users.js"
import { provisionNewUser } from "./auth-provision.js"
import logger from "../lib/logger.js"
import { SESSION_COOKIE_OPTS, COOKIE_NAMES } from "../lib/cookies.js"

export type AuthVariables = {
  userId: string
  userEmail: string
  onboardingStep: number
}

export const authMiddleware = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const jwt = getCookie(c, COOKIE_NAMES.jwt)
    const refreshToken = getCookie(c, COOKIE_NAMES.refreshToken) ?? ""

    if (!jwt) {
      return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401)
    }

    let crossmintUserId: string

    if (refreshToken) {
      // Full session validation + refresh when we have both tokens
      try {
        const session = await crossmintAuth.getSession({ jwt, refreshToken })
        crossmintUserId = session.userId
        // Refresh cookies if tokens changed
        const newJwt = typeof session.jwt === "string" ? session.jwt : ""
        const rt = session.refreshToken
        const newRefreshToken = typeof rt === "string" ? rt : (rt as any)?.secret ?? ""
        if (newJwt && newJwt !== jwt) {
          setCookie(c, COOKIE_NAMES.jwt, newJwt, SESSION_COOKIE_OPTS)
          logger.info({ crossmintUserId, event: "auth_refresh" }, "JWT refreshed")
        }
        if (newRefreshToken && newRefreshToken !== refreshToken) {
          setCookie(c, COOKIE_NAMES.refreshToken, newRefreshToken, SESSION_COOKIE_OPTS)
        }
        logger.debug({ crossmintUserId, event: "auth_success" }, "Session validated")
      } catch (err) {
        logger.warn({ err, event: "auth_failure" }, "Session validation failed")
        return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401)
      }
    } else {
      // JWT-only mode: decode and check expiry (no refresh possible)
      try {
        const parts = jwt.split(".")
        if (parts.length !== 3) throw new Error("Malformed JWT")
        const payload = JSON.parse(atob(parts[1]))
        if (!payload.sub || (payload.exp && payload.exp * 1000 < Date.now())) {
          return c.json({ error: "Unauthorized", code: "JWT_EXPIRED" }, 401)
        }
        crossmintUserId = payload.sub
        logger.debug({ crossmintUserId, event: "auth_jwt_only" }, "JWT-only auth (no refresh token)")
      } catch {
        return c.json({ error: "Unauthorized", code: "INVALID_JWT" }, 401)
      }
    }

    // Look up existing user
    let existingUser: User | undefined
    try {
      existingUser = await db.query.users?.findFirst({
        where: eq(users.crossmintUserId, crossmintUserId),
      })
    } catch (dbErr) {
      logger.error({ err: dbErr, crossmintUserId, event: "auth_db_lookup_failed" }, "DB lookup failed")
      return c.json({ error: "Internal server error", code: "DATABASE_ERROR" }, 500)
    }

    if (existingUser) {
      c.set("userId", existingUser.id)
      c.set("userEmail", existingUser.email)
      c.set("onboardingStep", existingUser.onboardingStep)
      await next()
      return
    }

    // New user — provision
    const emailHint = getCookie(c, COOKIE_NAMES.email)
    logger.info({ crossmintUserId, emailHint: emailHint || "(none)", event: "auth_provision_start" }, "Provisioning new user")
    const result = await provisionNewUser(crossmintUserId, emailHint || undefined)

    if (!result.ok) {
      logger.warn({ crossmintUserId, result, event: "auth_provision_failed" }, "Provisioning failed")
      return c.json({ error: result.error, code: result.code }, result.status as 401 | 500 | 503)
    }

    c.set("userId", result.userId)
    c.set("userEmail", result.email)
    c.set("onboardingStep", 0)
    await next()
  }
)
