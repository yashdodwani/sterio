/**
 * Integration tests: Auth middleware + /api/auth routes
 *
 * Strategy:
 * - Real DB (Neon) — no DB mocks per constitution
 * - Crossmint SDK mocked (external service boundary)
 * - Hono app assembled inline — no server process needed
 * - Each test cleans up its own rows via afterEach
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, mock, spyOn } from "bun:test"
import { WalletProvisioningError } from "../../src/lib/errors.js"
import { Hono } from "hono"
import { eq } from "drizzle-orm"
import { db } from "../../src/db/client.js"
import { users } from "../../src/db/schema/users.js"
import { authMiddleware } from "../../src/middleware/auth.js"
import { authRoute } from "../../src/routes/auth.js"

// ─── Test fixtures ────────────────────────────────────────────────────────────

const FAKE_CROSSMINT_USER_ID = "cm-test-user-001"
const FAKE_EMAIL = "testuser@example.com"
const FAKE_WALLET_ADDRESS = "0xDeAdBeEf00000000000000000000000000000001"
const FAKE_WALLET_ID = "wlt-test-001"
const VALID_JWT = "eyJ.valid.jwt"
const VALID_REFRESH = "refresh-token-abc"

// ─── Mock Crossmint SDK ───────────────────────────────────────────────────────

import * as crossmintLib from "../../src/lib/crossmint.js"

const mockGetSession = mock(async (_: { jwt: string; refreshToken: string }) => ({
  userId: FAKE_CROSSMINT_USER_ID,
  jwt: VALID_JWT,
  refreshToken: VALID_REFRESH,
}))

const mockGetUser = mock(async (_: string) => ({
  email: FAKE_EMAIL,
}))

const mockLogout = mock(async () => {})

// ─── Mock Crossmint wallet provisioning ──────────────────────────────────────

import * as walletService from "../../src/services/wallet-service.js"
import { Effect } from "effect"

const mockProvisionWallet = mock((_email: string) =>
  Effect.succeed({ address: FAKE_WALLET_ADDRESS, walletId: FAKE_WALLET_ID })
)

// ─── Build test app ───────────────────────────────────────────────────────────

function buildApp() {
  const app = new Hono()
  app.use("/api/*", authMiddleware)
  app.route("/api/auth", authRoute)
  // Minimal protected echo route for middleware-only tests
  app.get("/api/ping", (c) =>
    c.json({ userId: c.get("userId"), email: c.get("userEmail") })
  )
  return app
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validCookieHeader() {
  return `crossmint-jwt=${VALID_JWT}; crossmint-refresh-token=${VALID_REFRESH}`
}

async function cleanupTestUser() {
  await db.delete(users).where(eq(users.crossmintUserId, FAKE_CROSSMINT_USER_ID))
}

async function seedUser(overrides: Partial<typeof users.$inferInsert> = {}) {
  const [user] = await db
    .insert(users)
    .values({
      crossmintUserId: FAKE_CROSSMINT_USER_ID,
      email: FAKE_EMAIL,
      walletAddress: FAKE_WALLET_ADDRESS,
      crossmintWalletId: FAKE_WALLET_ID,
      walletStatus: "active",
      ...overrides,
    })
    .returning()
  return user
}

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeAll(() => {
  // Replace crossmintAuth methods with mocks
  ;(crossmintLib.crossmintAuth as any).getSession = mockGetSession
  ;(crossmintLib.crossmintAuth as any).getUser = mockGetUser
  ;(crossmintLib.crossmintAuth as any).logout = mockLogout

  // Replace wallet provisioning
  spyOn(walletService, "provisionWallet").mockImplementation(mockProvisionWallet)
})

afterEach(async () => {
  await cleanupTestUser()
  mockGetSession.mockClear()
  mockGetUser.mockClear()
  mockProvisionWallet.mockClear()
})

afterAll(async () => {
  await cleanupTestUser()
})

// ─────────────────────────────────────────────────────────────────────────────
// US3 — Protected Routes Enforcement
// ─────────────────────────────────────────────────────────────────────────────

describe("Auth middleware — 401 enforcement", () => {
  it("rejects request with no cookies", async () => {
    const app = buildApp()
    const res = await app.request("/api/ping")
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.code).toBe("UNAUTHORIZED")
  })

  it("rejects request with only missing crossmint-jwt cookie", async () => {
    const app = buildApp()
    const res = await app.request("/api/ping", {
      headers: { Cookie: "crossmint-refresh-token=some-refresh" },
    })
    expect(res.status).toBe(401)
  })

  it("rejects request when getSession throws (invalid/tampered JWT)", async () => {
    mockGetSession.mockImplementationOnce(async () => {
      throw new Error("Invalid JWT signature")
    })
    const app = buildApp()
    const res = await app.request("/api/ping", {
      headers: { Cookie: validCookieHeader() },
    })
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.code).toBe("UNAUTHORIZED")
  })

  it("rejects when JWT expired and no valid refresh token", async () => {
    mockGetSession.mockImplementationOnce(async () => {
      throw new Error("Token expired")
    })
    const app = buildApp()
    const res = await app.request("/api/ping", {
      headers: { Cookie: `crossmint-jwt=${VALID_JWT}` },
    })
    expect(res.status).toBe(401)
  })

  it("allows request with valid JWT and sets userId on context", async () => {
    await seedUser()
    const app = buildApp()
    const res = await app.request("/api/ping", {
      headers: { Cookie: validCookieHeader() },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.email).toBe(FAKE_EMAIL)
    expect(typeof body.userId).toBe("string")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// US1 — New User: wallet provisioned on first request
// ─────────────────────────────────────────────────────────────────────────────

describe("Auth middleware — new user provisioning", () => {
  it("creates user row and provisions wallet on first authenticated request", async () => {
    const app = buildApp()
    const res = await app.request("/api/ping", {
      headers: { Cookie: validCookieHeader() },
    })

    expect(res.status).toBe(200)
    expect(mockGetUser).toHaveBeenCalledWith(FAKE_CROSSMINT_USER_ID)
    expect(mockProvisionWallet).toHaveBeenCalledWith(FAKE_EMAIL)

    // Verify DB row
    const user = await db.query.users?.findFirst({
      where: eq(users.crossmintUserId, FAKE_CROSSMINT_USER_ID),
    })
    expect(user).toBeDefined()
    expect(user!.email).toBe(FAKE_EMAIL)
    expect(user!.walletAddress).toBe(FAKE_WALLET_ADDRESS)
    expect(user!.walletStatus).toBe("active")
  })

  it("returns 503 and rolls back user row when wallet provisioning fails", async () => {
    mockProvisionWallet.mockImplementationOnce((_email: string) =>
      Effect.fail(new WalletProvisioningError({ cause: new Error("Crossmint API timeout") }))
    )

    const app = buildApp()
    const res = await app.request("/api/ping", {
      headers: { Cookie: validCookieHeader() },
    })

    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.code).toBe("WALLET_PROVISION_FAILED")

    // User row must be rolled back
    const user = await db.query.users?.findFirst({
      where: eq(users.crossmintUserId, FAKE_CROSSMINT_USER_ID),
    })
    expect(user).toBeUndefined()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// US2 — Returning User: wallet NOT re-provisioned
// ─────────────────────────────────────────────────────────────────────────────

describe("Auth middleware — returning user", () => {
  it("does not call wallet provisioning for existing user", async () => {
    await seedUser()
    const app = buildApp()
    await app.request("/api/ping", {
      headers: { Cookie: validCookieHeader() },
    })
    expect(mockProvisionWallet).not.toHaveBeenCalled()
  })

  it("returns same wallet address on second request", async () => {
    await seedUser()
    const app = buildApp()

    const res1 = await app.request("/api/auth/profile", {
      headers: { Cookie: validCookieHeader() },
    })
    const res2 = await app.request("/api/auth/profile", {
      headers: { Cookie: validCookieHeader() },
    })

    const b1 = await res1.json()
    const b2 = await res2.json()
    expect(b1.walletAddress).toBe(b2.walletAddress)
    expect(b1.walletAddress).toBe(FAKE_WALLET_ADDRESS)
  })

  it("sets refreshed JWT cookies when getSession returns new tokens", async () => {
    const newJwt = "eyJ.refreshed.jwt"
    mockGetSession.mockImplementationOnce(async () => ({
      userId: FAKE_CROSSMINT_USER_ID,
      jwt: newJwt,
      refreshToken: "new-refresh-token",
    }))
    await seedUser()
    const app = buildApp()

    const res = await app.request("/api/ping", {
      headers: { Cookie: validCookieHeader() },
    })

    expect(res.status).toBe(200)
    const setCookieHeader = res.headers.get("set-cookie") ?? ""
    expect(setCookieHeader).toContain("crossmint-jwt=")
    expect(setCookieHeader).toContain(newJwt)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// US3 — GET /api/auth/profile
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/auth/profile", () => {
  it("returns 401 without cookies", async () => {
    const app = buildApp()
    const res = await app.request("/api/auth/profile")
    expect(res.status).toBe(401)
  })

  it("returns profile with walletAddress in 0x format", async () => {
    await seedUser()
    const app = buildApp()
    const res = await app.request("/api/auth/profile", {
      headers: { Cookie: validCookieHeader() },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.email).toBe(FAKE_EMAIL)
    expect(body.walletAddress).toMatch(/^0x[a-fA-F0-9]{40}$/)
    expect(body.walletStatus).toBe("active")
    expect(typeof body.userId).toBe("string")
  })

  it("returns walletAddress null when wallet_status is pending", async () => {
    await seedUser({ walletAddress: null, walletStatus: "pending" })
    const app = buildApp()
    const res = await app.request("/api/auth/profile", {
      headers: { Cookie: validCookieHeader() },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.walletAddress).toBeNull()
    expect(body.walletStatus).toBe("pending")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// US3 — POST /api/auth/logout
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/auth/logout", () => {
  it("returns 401 without cookies", async () => {
    const app = buildApp()
    const res = await app.request("/api/auth/logout", { method: "POST" })
    expect(res.status).toBe(401)
  })

  it("clears crossmint cookies and returns success", async () => {
    await seedUser()
    const app = buildApp()
    const res = await app.request("/api/auth/logout", {
      method: "POST",
      headers: { Cookie: validCookieHeader() },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    const setCookieHeader = res.headers.get("set-cookie") ?? ""
    expect(setCookieHeader).toContain("crossmint-jwt=;")
    expect(setCookieHeader).toContain("crossmint-refresh-token=;")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// US1/US4 — wallet_status state transitions
// ─────────────────────────────────────────────────────────────────────────────

describe("Wallet status transitions", () => {
  it("user starts with wallet_status active after successful provisioning", async () => {
    const app = buildApp()
    await app.request("/api/ping", {
      headers: { Cookie: validCookieHeader() },
    })

    const user = await db.query.users?.findFirst({
      where: eq(users.crossmintUserId, FAKE_CROSSMINT_USER_ID),
    })
    expect(user!.walletStatus).toBe("active")
    expect(user!.walletAddress).toBe(FAKE_WALLET_ADDRESS)
    expect(user!.crossmintWalletId).toBe(FAKE_WALLET_ID)
  })

  it("concurrent requests for same new user only create one wallet", async () => {
    const app = buildApp()

    // Fire two simultaneous requests for the same new user
    const [res1, res2] = await Promise.all([
      app.request("/api/ping", { headers: { Cookie: validCookieHeader() } }),
      app.request("/api/ping", { headers: { Cookie: validCookieHeader() } }),
    ])

    // Both should succeed
    expect(res1.status).toBe(200)
    expect(res2.status).toBe(200)

    // Only one user row should exist
    const allUsers = await db
      .select()
      .from(users)
      .where(eq(users.crossmintUserId, FAKE_CROSSMINT_USER_ID))
    expect(allUsers).toHaveLength(1)
  })
})
