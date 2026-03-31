/**
 * Integration tests: auth middleware + /api/sessions routes
 *
 * Strategy:
 * - Real DB (Neon) — no DB mocks per constitution
 * - Crossmint SDK mocked (external service boundary)
 * - Hono app assembled inline — no server process needed
 * - Each test cleans up its own rows via afterEach
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, mock, spyOn } from "bun:test"
import { Hono } from "hono"
import { eq } from "drizzle-orm"
import { db } from "../../src/db/client.js"
import { users } from "../../src/db/schema/users.js"
import { chatSessions } from "../../src/db/schema/chat-sessions.js"
import { chatMessages } from "../../src/db/schema/chat-messages.js"
import { authMiddleware } from "../../src/middleware/auth.js"
import { createSessionRoutes } from "../../src/routes/sessions.js"
import { ChatSessionServiceLive } from "../../src/services/chat-session-service-live.js"

// ─── Test fixtures ─────────────────────────────────────────────────────────────

const FAKE_CROSSMINT_USER_ID = "cm-sess-test-user-001"
const FAKE_EMAIL = "sessuser@example.com"
const FAKE_WALLET_ADDRESS = "0xDeAdBeEf00000000000000000000000000000002"
const FAKE_WALLET_ID = "wlt-sess-001"
const VALID_JWT = "eyJ.sess.jwt"
const VALID_REFRESH = "refresh-sess-abc"

const FAKE_CROSSMINT_USER_ID_B = "cm-sess-test-user-002"
const FAKE_EMAIL_B = "sessuserb@example.com"

// ─── Mock Crossmint SDK ────────────────────────────────────────────────────────

import * as crossmintLib from "../../src/lib/crossmint.js"

const mockGetSession = mock(async (_: { jwt: string; refreshToken: string }) => ({
  userId: FAKE_CROSSMINT_USER_ID,
  jwt: VALID_JWT,
  refreshToken: VALID_REFRESH,
}))

const mockGetUser = mock(async (_: string) => ({ email: FAKE_EMAIL }))
const mockLogout = mock(async () => {})

// ─── Mock wallet provisioning ──────────────────────────────────────────────────

import * as walletService from "../../src/services/wallet-service.js"
import { Effect } from "effect"

const mockProvisionWallet = mock((_email: string) =>
  Effect.succeed({ address: FAKE_WALLET_ADDRESS, walletId: FAKE_WALLET_ID })
)

// ─── Build test app ────────────────────────────────────────────────────────────

function buildApp() {
  const app = new Hono()
  app.use("/api/*", authMiddleware)
  app.route("/api/sessions", createSessionRoutes(ChatSessionServiceLive))
  return app
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function validCookies() {
  return `crossmint-jwt=${VALID_JWT}; crossmint-refresh-token=${VALID_REFRESH}`
}

async function seedUser(
  crossmintUserId = FAKE_CROSSMINT_USER_ID,
  email = FAKE_EMAIL,
) {
  const [user] = await db
    .insert(users)
    .values({
      crossmintUserId,
      email,
      walletAddress: FAKE_WALLET_ADDRESS,
      crossmintWalletId: FAKE_WALLET_ID,
      walletStatus: "active",
    })
    .returning()
  return user
}

async function cleanupUser(crossmintUserId: string) {
  // cascades to chat_sessions → chat_messages
  await db.delete(users).where(eq(users.crossmintUserId, crossmintUserId))
}

async function cleanupSessions(userId: string) {
  await db.delete(chatSessions).where(eq(chatSessions.userId, userId))
}

// ─── Setup / teardown ──────────────────────────────────────────────────────────

let testUserId: string

beforeAll(async () => {
  ;(crossmintLib.crossmintAuth as any).getSession = mockGetSession
  ;(crossmintLib.crossmintAuth as any).getUser = mockGetUser
  ;(crossmintLib.crossmintAuth as any).logout = mockLogout
  spyOn(walletService, "provisionWallet").mockImplementation(mockProvisionWallet)

  const user = await seedUser()
  testUserId = user.id
})

afterEach(async () => {
  await cleanupSessions(testUserId)
  mockGetSession.mockClear()
})

afterAll(async () => {
  await cleanupUser(FAKE_CROSSMINT_USER_ID)
  await cleanupUser(FAKE_CROSSMINT_USER_ID_B)
})

// ─────────────────────────────────────────────────────────────────────────────
// CRUD — basic session operations
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/sessions", () => {
  it("creates a session and returns 201 with id/userId", async () => {
    const app = buildApp()
    const res = await app.request("/api/sessions", {
      method: "POST",
      headers: { Cookie: validCookies(), "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(typeof body.id).toBe("string")
    expect(body.userId).toBe(testUserId)
  })

  it("creates a session with the provided title", async () => {
    const app = buildApp()
    const res = await app.request("/api/sessions", {
      method: "POST",
      headers: { Cookie: validCookies(), "Content-Type": "application/json" },
      body: JSON.stringify({ title: "My Chat" }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.title).toBe("My Chat")
  })
})

describe("GET /api/sessions", () => {
  it("returns empty list when no sessions exist", async () => {
    const app = buildApp()
    const res = await app.request("/api/sessions", {
      headers: { Cookie: validCookies() },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sessions).toEqual([])
    expect(body.total).toBe(0)
  })

  it("returns sessions after creating some", async () => {
    const app = buildApp()
    await app.request("/api/sessions", {
      method: "POST",
      headers: { Cookie: validCookies(), "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Session A" }),
    })
    await app.request("/api/sessions", {
      method: "POST",
      headers: { Cookie: validCookies(), "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Session B" }),
    })

    const res = await app.request("/api/sessions", {
      headers: { Cookie: validCookies() },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sessions).toHaveLength(2)
    expect(body.total).toBe(2)
  })
})

describe("GET /api/sessions/:id", () => {
  it("returns session with empty messages array", async () => {
    const app = buildApp()
    const createRes = await app.request("/api/sessions", {
      method: "POST",
      headers: { Cookie: validCookies(), "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    const { id } = await createRes.json()

    const res = await app.request(`/api/sessions/${id}`, {
      headers: { Cookie: validCookies() },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe(id)
    expect(Array.isArray(body.messages)).toBe(true)
    expect(body.messages).toHaveLength(0)
  })

  it("returns messages with parts and msgId in UIMessage format", async () => {
    const app = buildApp()
    const createRes = await app.request("/api/sessions", {
      method: "POST",
      headers: { Cookie: validCookies(), "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    const { id: sessionId } = await createRes.json()

    // Insert messages directly with parts + msg_id
    await db.insert(chatMessages).values([
      {
        sessionId,
        msgId: "user-msg-001",
        role: "user",
        parts: [{ type: "text", text: "Find me sneakers" }],
      },
      {
        sessionId,
        msgId: "assistant-msg-001",
        role: "assistant",
        parts: [
          {
            type: "tool-searchProducts",
            toolCallId: "call-abc",
            state: "output-available",
            input: { query: "sneakers" },
            output: { products: [{ id: "p1", name: "Nike Air" }], totalResults: 1, query: "sneakers" },
          },
          { type: "text", text: "Here are some sneakers!" },
        ],
      },
    ])

    const res = await app.request(`/api/sessions/${sessionId}`, {
      headers: { Cookie: validCookies() },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.messages).toHaveLength(2)

    // Verify user message uses msgId as id
    const userMsg = body.messages[0]
    expect(userMsg.id).toBe("user-msg-001")
    expect(userMsg.role).toBe("user")
    expect(userMsg.parts).toEqual([{ type: "text", text: "Find me sneakers" }])

    // Verify assistant message has tool results + text in parts
    const assistantMsg = body.messages[1]
    expect(assistantMsg.id).toBe("assistant-msg-001")
    expect(assistantMsg.role).toBe("assistant")
    expect(assistantMsg.parts).toHaveLength(2)

    const toolPart = assistantMsg.parts.find((p: any) => p.type === "tool-searchProducts")
    expect(toolPart).toBeDefined()
    expect(toolPart.output.products).toHaveLength(1)
    expect(toolPart.output.products[0].name).toBe("Nike Air")

    const textPart = assistantMsg.parts.find((p: any) => p.type === "text")
    expect(textPart.text).toBe("Here are some sneakers!")
  })
})

describe("PATCH /api/sessions/:id", () => {
  it("renames a session", async () => {
    const app = buildApp()
    const createRes = await app.request("/api/sessions", {
      method: "POST",
      headers: { Cookie: validCookies(), "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Old Title" }),
    })
    const { id } = await createRes.json()

    const res = await app.request(`/api/sessions/${id}`, {
      method: "PATCH",
      headers: { Cookie: validCookies(), "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New Title" }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.title).toBe("New Title")
  })
})

describe("DELETE /api/sessions/:id", () => {
  it("returns 204 and subsequent GET returns 404", async () => {
    const app = buildApp()
    const createRes = await app.request("/api/sessions", {
      method: "POST",
      headers: { Cookie: validCookies(), "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    const { id } = await createRes.json()

    const deleteRes = await app.request(`/api/sessions/${id}`, {
      method: "DELETE",
      headers: { Cookie: validCookies() },
    })
    expect(deleteRes.status).toBe(204)

    const getRes = await app.request(`/api/sessions/${id}`, {
      headers: { Cookie: validCookies() },
    })
    expect(getRes.status).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────────────────────────

describe("Pagination", () => {
  async function createSessions(app: Hono, count: number) {
    for (let i = 0; i < count; i++) {
      await app.request("/api/sessions", {
        method: "POST",
        headers: { Cookie: validCookies(), "Content-Type": "application/json" },
        body: JSON.stringify({ title: `Session ${i}` }),
      })
    }
  }

  it("limit=2&offset=0 returns 2 sessions, total=5", async () => {
    const app = buildApp()
    await createSessions(app, 5)

    const res = await app.request("/api/sessions?limit=2&offset=0", {
      headers: { Cookie: validCookies() },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sessions).toHaveLength(2)
    expect(body.total).toBe(5)
  })

  it("limit=2&offset=2 returns next 2 sessions", async () => {
    const app = buildApp()
    await createSessions(app, 5)

    const res = await app.request("/api/sessions?limit=2&offset=2", {
      headers: { Cookie: validCookies() },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sessions).toHaveLength(2)
    expect(body.total).toBe(5)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Ownership enforcement
// ─────────────────────────────────────────────────────────────────────────────

describe("Ownership enforcement", () => {
  let userBId: string
  let sessionBId: string

  beforeAll(async () => {
    // Seed user B directly
    const userB = await seedUser(FAKE_CROSSMINT_USER_ID_B, FAKE_EMAIL_B)
    userBId = userB.id
    // Insert session owned by user B directly via DB
    const [session] = await db
      .insert(chatSessions)
      .values({ userId: userBId })
      .returning()
    sessionBId = session.id
  })

  afterAll(async () => {
    await cleanupUser(FAKE_CROSSMINT_USER_ID_B)
  })

  it("GET session owned by user B as user A returns 403", async () => {
    const app = buildApp()
    const res = await app.request(`/api/sessions/${sessionBId}`, {
      headers: { Cookie: validCookies() },
    })
    expect(res.status).toBe(403)
  })

  it("PATCH session owned by user B as user A returns 403", async () => {
    const app = buildApp()
    const res = await app.request(`/api/sessions/${sessionBId}`, {
      method: "PATCH",
      headers: { Cookie: validCookies(), "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Hijacked" }),
    })
    expect(res.status).toBe(403)
  })

  it("DELETE session owned by user B as user A returns 403", async () => {
    const app = buildApp()
    const res = await app.request(`/api/sessions/${sessionBId}`, {
      method: "DELETE",
      headers: { Cookie: validCookies() },
    })
    expect(res.status).toBe(403)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Error cases
// ─────────────────────────────────────────────────────────────────────────────

describe("Error cases", () => {
  it("invalid session ID (non-UUID) returns 400", async () => {
    const app = buildApp()
    const res = await app.request("/api/sessions/not-a-uuid", {
      headers: { Cookie: validCookies() },
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe("VALIDATION_ERROR")
  })

  it("non-existent session UUID returns 404", async () => {
    const app = buildApp()
    const res = await app.request("/api/sessions/00000000-0000-0000-0000-000000000000", {
      headers: { Cookie: validCookies() },
    })
    expect(res.status).toBe(404)
  })

  it("unauthenticated request (no cookies) returns 401", async () => {
    const app = buildApp()
    const res = await app.request("/api/sessions")
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.code).toBe("UNAUTHORIZED")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Cascade delete
// ─────────────────────────────────────────────────────────────────────────────

describe("Cascade delete", () => {
  it("deleting a session also deletes its messages", async () => {
    const app = buildApp()
    const createRes = await app.request("/api/sessions", {
      method: "POST",
      headers: { Cookie: validCookies(), "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    const { id: sessionId } = await createRes.json()

    // Insert a message directly via DB
    await db.insert(chatMessages).values({
      sessionId,
      role: "user",
      parts: [{ type: "text", text: "Hello" }],
    })

    // Verify message exists
    const before = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
    expect(before).toHaveLength(1)

    // Delete session via API
    await app.request(`/api/sessions/${sessionId}`, {
      method: "DELETE",
      headers: { Cookie: validCookies() },
    })

    // Messages should be gone (cascade)
    const after = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
    expect(after).toHaveLength(0)
  })
})
