/**
 * Integration tests: Onboarding API endpoints
 *
 * Strategy:
 * - Real DB (Neon) — no DB mocks
 * - Crossmint SDK mocked (external service boundary)
 * - Hono app assembled inline
 * - Each test cleans up its own rows via afterEach
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, mock, spyOn } from "bun:test"
import { Hono } from "hono"
import { eq } from "drizzle-orm"
import { db } from "../../src/db/client.js"
import { users } from "../../src/db/schema/users.js"
import { authMiddleware } from "../../src/middleware/auth.js"
import { onboardingRoute } from "../../src/routes/onboarding.js"
import { authRoute } from "../../src/routes/auth.js"
import { onboardingGate } from "../../src/middleware/onboarding-gate.js"

// ─── Test fixtures ────────────────────────────────────────────────────────────

const FAKE_CROSSMINT_USER_ID = "cm-onboard-test-001"
const FAKE_EMAIL = "onboard@example.com"
const FAKE_WALLET_ADDRESS = "0xDeAdBeEf00000000000000000000000000000002"
const FAKE_WALLET_ID = "wlt-onboard-001"
const VALID_JWT = "eyJ.valid.onboard"
const VALID_REFRESH = "refresh-onboard-abc"

// ─── Mock Crossmint SDK ───────────────────────────────────────────────────────

import * as crossmintLib from "../../src/lib/crossmint.js"
import * as walletService from "../../src/services/wallet-service.js"
import { Effect } from "effect"

const mockGetSession = mock(async (_: { jwt: string; refreshToken: string }) => ({
  userId: FAKE_CROSSMINT_USER_ID,
  jwt: VALID_JWT,
  refreshToken: VALID_REFRESH,
}))

const mockGetUser = mock(async (_: string) => ({
  email: FAKE_EMAIL,
}))

const mockProvisionWallet = mock((_email: string) =>
  Effect.succeed({ address: FAKE_WALLET_ADDRESS, walletId: FAKE_WALLET_ID })
)

// ─── Build test app ───────────────────────────────────────────────────────────

function buildApp() {
  const app = new Hono()
  app.use("/api/*", authMiddleware)
  app.route("/api/onboarding", onboardingRoute)
  app.route("/api/auth", authRoute)
  return app
}

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
      onboardingStep: 0,
      ...overrides,
    })
    .returning()
  return user
}

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeAll(() => {
  ;(crossmintLib.crossmintAuth as any).getSession = mockGetSession
  ;(crossmintLib.crossmintAuth as any).getUser = mockGetUser
  ;(crossmintLib.crossmintAuth as any).logout = mock(async () => {})
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
// GET /api/onboarding/status
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/onboarding/status", () => {
  it("returns step 0 and completed false for new user", async () => {
    await seedUser()
    const app = buildApp()
    const res = await app.request("/api/onboarding/status", {
      headers: { Cookie: validCookieHeader() },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.step).toBe(0)
    expect(body.completed).toBe(false)
  })

  it("returns step 3 and completed true after full onboarding", async () => {
    await seedUser({ onboardingStep: 3 })
    const app = buildApp()
    const res = await app.request("/api/onboarding/status", {
      headers: { Cookie: validCookieHeader() },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.step).toBe(3)
    expect(body.completed).toBe(true)
  })

  it("returns 401 without auth", async () => {
    const app = buildApp()
    const res = await app.request("/api/onboarding/status")
    expect(res.status).toBe(401)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/onboarding/step-1
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/onboarding/step-1", () => {
  it("saves display name and advances to step 1", async () => {
    await seedUser()
    const app = buildApp()
    const res = await app.request("/api/onboarding/step-1", {
      method: "POST",
      headers: { Cookie: validCookieHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: "Ben" }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.step).toBe(1)

    const user = await db.query.users?.findFirst({
      where: eq(users.crossmintUserId, FAKE_CROSSMINT_USER_ID),
    })
    expect(user!.displayName).toBe("Ben")
    expect(user!.onboardingStep).toBe(1)
  })

  it("rejects empty display name", async () => {
    await seedUser()
    const app = buildApp()
    const res = await app.request("/api/onboarding/step-1", {
      method: "POST",
      headers: { Cookie: validCookieHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: "" }),
    })
    expect(res.status).toBe(400)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/onboarding/step-2
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/onboarding/step-2", () => {
  it("saves address and advances to step 2", async () => {
    await seedUser({ onboardingStep: 1 })
    const app = buildApp()
    const res = await app.request("/api/onboarding/step-2", {
      method: "POST",
      headers: { Cookie: validCookieHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "Ben",
        lastName: "Smith",
        street: "123 Main St",
        country: "US",
        city: "New York",
        state: "NY",
        zip: "10001",
      }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.step).toBe(2)

    const user = await db.query.users?.findFirst({
      where: eq(users.crossmintUserId, FAKE_CROSSMINT_USER_ID),
    })
    expect(user!.firstName).toBe("Ben")
    expect(user!.country).toBe("US")
    expect(user!.onboardingStep).toBe(2)
  })

  it("rejects if step 1 not completed", async () => {
    await seedUser({ onboardingStep: 0 })
    const app = buildApp()
    const res = await app.request("/api/onboarding/step-2", {
      method: "POST",
      headers: { Cookie: validCookieHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "Ben",
        lastName: "Smith",
        street: "123 Main St",
        country: "US",
        city: "New York",
        zip: "10001",
      }),
    })
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.code).toBe("STEP_NOT_REACHED")
  })

  it("rejects invalid country code", async () => {
    await seedUser({ onboardingStep: 1 })
    const app = buildApp()
    const res = await app.request("/api/onboarding/step-2", {
      method: "POST",
      headers: { Cookie: validCookieHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "Ben",
        lastName: "Smith",
        street: "123 Main St",
        country: "XX",
        city: "New York",
        zip: "10001",
      }),
    })
    expect(res.status).toBe(400)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/onboarding/step-3
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/onboarding/step-3", () => {
  it("saves sizes and completes onboarding", async () => {
    await seedUser({ onboardingStep: 2 })
    const app = buildApp()
    const res = await app.request("/api/onboarding/step-3", {
      method: "POST",
      headers: { Cookie: validCookieHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({
        topsSize: "M",
        bottomsSize: "32",
        footwearSize: "10",
      }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.step).toBe(3)

    const user = await db.query.users?.findFirst({
      where: eq(users.crossmintUserId, FAKE_CROSSMINT_USER_ID),
    })
    expect(user!.topsSize).toBe("M")
    expect(user!.bottomsSize).toBe("32")
    expect(user!.footwearSize).toBe("10")
    expect(user!.onboardingStep).toBe(3)
  })

  it("rejects if step 2 not completed", async () => {
    await seedUser({ onboardingStep: 1 })
    const app = buildApp()
    const res = await app.request("/api/onboarding/step-3", {
      method: "POST",
      headers: { Cookie: validCookieHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({
        topsSize: "M",
        bottomsSize: "32",
        footwearSize: "10",
      }),
    })
    expect(res.status).toBe(403)
  })

  it("rejects invalid tops size", async () => {
    await seedUser({ onboardingStep: 2 })
    const app = buildApp()
    const res = await app.request("/api/onboarding/step-3", {
      method: "POST",
      headers: { Cookie: validCookieHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({
        topsSize: "XXXL",
        bottomsSize: "32",
        footwearSize: "10",
      }),
    })
    expect(res.status).toBe(400)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding gate middleware
// ─────────────────────────────────────────────────────────────────────────────

describe("Onboarding gate middleware", () => {
  function buildGatedApp() {
    const app = new Hono()
    app.use("/api/*", authMiddleware)
    app.route("/api/onboarding", onboardingRoute)
    app.route("/api/auth", authRoute)
    app.use("/api/chat/*", onboardingGate)
    app.get("/api/chat/test", (c) => c.json({ ok: true }))
    return app
  }

  it("blocks user with incomplete onboarding", async () => {
    await seedUser({ onboardingStep: 1 })
    const app = buildGatedApp()
    const res = await app.request("/api/chat/test", {
      headers: { Cookie: validCookieHeader() },
    })
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.code).toBe("ONBOARDING_INCOMPLETE")
    expect(body.step).toBe(1)
  })

  it("allows user with completed onboarding", async () => {
    await seedUser({ onboardingStep: 3 })
    const app = buildGatedApp()
    const res = await app.request("/api/chat/test", {
      headers: { Cookie: validCookieHeader() },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it("blocks user with step 0", async () => {
    await seedUser({ onboardingStep: 0 })
    const app = buildGatedApp()
    const res = await app.request("/api/chat/test", {
      headers: { Cookie: validCookieHeader() },
    })
    expect(res.status).toBe(403)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Profile includes onboardingStep
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/auth/profile includes onboardingStep", () => {
  it("includes onboardingStep in profile response", async () => {
    await seedUser({ onboardingStep: 2 })
    const app = buildApp()
    const res = await app.request("/api/auth/profile", {
      headers: { Cookie: validCookieHeader() },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.onboardingStep).toBe(2)
  })
})
