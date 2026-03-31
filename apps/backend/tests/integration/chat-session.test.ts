/**
 * Integration tests: Chat + Session management
 *
 * Strategy:
 * - Real DB (Neon) — no DB mocks per constitution
 * - Crossmint SDK mocked (external service boundary)
 * - LLM (streamText) mocked — no real OpenAI calls
 * - Hono app assembled inline
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, mock, spyOn } from "bun:test"
import { Hono } from "hono"
import { eq } from "drizzle-orm"
import { db } from "../../src/db/client.js"
import { users } from "../../src/db/schema/users.js"
import { chatSessions } from "../../src/db/schema/chat-sessions.js"
import { chatMessages } from "../../src/db/schema/chat-messages.js"
import { authMiddleware } from "../../src/middleware/auth.js"
import { createChatRoute } from "../../src/routes/chat.js"
import { MockProductServiceLive } from "../../src/services/mock-product-service.js"
import { ChatSessionServiceLive } from "../../src/services/chat-session-service-live.js"

// ─── Test fixtures ────────────────────────────────────────────────────────────

const FAKE_USER_A_CM_ID = "cm-chat-test-user-a"
const FAKE_USER_B_CM_ID = "cm-chat-test-user-b"
const FAKE_EMAIL_A = "chat-user-a@example.com"
const FAKE_EMAIL_B = "chat-user-b@example.com"
const FAKE_WALLET_A = "0xaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaA"
const FAKE_WALLET_B = "0xbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbB"
const VALID_JWT = "eyJ.valid.jwt"
const VALID_REFRESH = "refresh-token-abc"

// ─── Mock Crossmint SDK ───────────────────────────────────────────────────────

import * as crossmintLib from "../../src/lib/crossmint.js"
import * as walletService from "../../src/services/wallet-service.js"
import { Effect } from "effect"
import * as aiModule from "ai"

const mockGetSession = mock(async (_: { jwt: string; refreshToken: string }) => ({
  userId: FAKE_USER_A_CM_ID,
  jwt: VALID_JWT,
  refreshToken: VALID_REFRESH,
}))

const mockGetUser = mock(async (_: string) => ({ email: FAKE_EMAIL_A }))
const mockLogout = mock(async () => {})

const mockProvisionWallet = mock((_email: string) =>
  Effect.succeed({ address: FAKE_WALLET_A, walletId: "wlt-chat-a" }),
)

// ─── Mock LLM (streamText + convertToModelMessages) ──────────────────────────

const mockConvertToModelMessages = mock(async (messages: any) =>
  (Array.isArray(messages) ? messages : []).map((m: any) => ({
    role: m.role ?? "user",
    content: typeof m.content === "string" ? [{ type: "text", text: m.content }] : m.content,
  })),
)

const mockStreamText = mock((...args: any[]) => {
  return {
    toUIMessageStreamResponse: (streamOpts?: any) => {
      if (streamOpts?.onFinish) {
        const originalMessages = streamOpts.originalMessages ?? []
        const responseMessage = {
          id: "mock-assistant-msg",
          role: "assistant",
          parts: [{ type: "text", text: "Mock assistant response" }],
        }
        setTimeout(() => {
          streamOpts.onFinish({
            messages: [...originalMessages, responseMessage],
            responseMessage,
          })
        }, 10)
      }
      return new Response("mock stream", {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })
    },
  }
})

// ─── Build test app ───────────────────────────────────────────────────────────

function buildApp() {
  const app = new Hono()
  app.use("/api/*", authMiddleware)
  app.route("/api/chat", createChatRoute(MockProductServiceLive, ChatSessionServiceLive))
  return app
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cookieHeader(jwt = VALID_JWT, refresh = VALID_REFRESH) {
  return `crossmint-jwt=${jwt}; crossmint-refresh-token=${refresh}`
}

async function seedUser(cmId: string, email: string, wallet: string, walletId: string) {
  const [user] = await db
    .insert(users)
    .values({
      crossmintUserId: cmId,
      email,
      walletAddress: wallet,
      crossmintWalletId: walletId,
      walletStatus: "active",
    })
    .returning()
  return user!
}

async function cleanupAll() {
  // Delete chat data for test sessions (cascade handles messages)
  const testUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.crossmintUserId, FAKE_USER_A_CM_ID))
  const testUsersB = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.crossmintUserId, FAKE_USER_B_CM_ID))

  for (const u of [...testUsers, ...testUsersB]) {
    await db.delete(chatSessions).where(eq(chatSessions.userId, u.id))
  }
  await db.delete(users).where(eq(users.crossmintUserId, FAKE_USER_A_CM_ID))
  await db.delete(users).where(eq(users.crossmintUserId, FAKE_USER_B_CM_ID))
}

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeAll(() => {
  ;(crossmintLib.crossmintAuth as any).getSession = mockGetSession
  ;(crossmintLib.crossmintAuth as any).getUser = mockGetUser
  ;(crossmintLib.crossmintAuth as any).logout = mockLogout
  spyOn(walletService, "provisionWallet").mockImplementation(mockProvisionWallet)
  spyOn(aiModule, "convertToModelMessages").mockImplementation(mockConvertToModelMessages as any)
  spyOn(aiModule, "streamText").mockImplementation(mockStreamText as any)
})

afterEach(async () => {
  await cleanupAll()
  mockGetSession.mockClear()
  mockGetUser.mockClear()
  mockProvisionWallet.mockClear()
  mockConvertToModelMessages.mockClear()
  mockStreamText.mockClear()
})

afterAll(async () => {
  await cleanupAll()
})

// ─────────────────────────────────────────────────────────────────────────────
// Unauthenticated
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/chat — unauthenticated", () => {
  it("returns 401 without cookies", async () => {
    const app = buildApp()
    const res = await app.request("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "Hello" }] }),
    })
    expect(res.status).toBe(401)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Auto-create session
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/chat — auto-create session", () => {
  it("creates session and returns X-Session-Id header when no sessionId given", async () => {
    await seedUser(FAKE_USER_A_CM_ID, FAKE_EMAIL_A, FAKE_WALLET_A, "wlt-a")
    const app = buildApp()
    const res = await app.request("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader(),
      },
      body: JSON.stringify({ messages: [{ role: "user", content: "Hello" }] }),
    })

    expect(res.status).toBe(200)
    const sessionId = res.headers.get("X-Session-Id")
    expect(sessionId).toBeTruthy()
    expect(typeof sessionId).toBe("string")
  })

  it("persists session row in DB for the authenticated user", async () => {
    const userA = await seedUser(FAKE_USER_A_CM_ID, FAKE_EMAIL_A, FAKE_WALLET_A, "wlt-a")
    const app = buildApp()
    const res = await app.request("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader(),
      },
      body: JSON.stringify({ messages: [{ role: "user", content: "Hello" }] }),
    })

    expect(res.status).toBe(200)
    const sessionId = res.headers.get("X-Session-Id")!

    const session = await db.query.chatSessions?.findFirst({
      where: eq(chatSessions.id, sessionId),
    })
    expect(session).toBeDefined()
    expect(session!.userId).toBe(userA.id)
  })

  it("persists the user message in chat_messages", async () => {
    await seedUser(FAKE_USER_A_CM_ID, FAKE_EMAIL_A, FAKE_WALLET_A, "wlt-a")
    const app = buildApp()
    const res = await app.request("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader(),
      },
      body: JSON.stringify({ messages: [{ role: "user", content: "Hello" }] }),
    })

    expect(res.status).toBe(200)
    const sessionId = res.headers.get("X-Session-Id")!

    // Wait for async onFinish persistence
    await new Promise((r) => setTimeout(r, 100))

    const msgs = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))

    expect(msgs.length).toBeGreaterThanOrEqual(1)
    const userMsg = msgs.find((m) => m.role === "user")
    expect(userMsg).toBeDefined()
    expect(Array.isArray(userMsg!.parts)).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Session reuse
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/chat — session reuse", () => {
  it("reuses existing session and persists new messages", async () => {
    const userA = await seedUser(FAKE_USER_A_CM_ID, FAKE_EMAIL_A, FAKE_WALLET_A, "wlt-a")
    const app = buildApp()

    // Create session on first request
    const res1 = await app.request("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader(),
      },
      body: JSON.stringify({ messages: [{ role: "user", content: "First message" }] }),
    })
    expect(res1.status).toBe(200)
    const sessionId = res1.headers.get("X-Session-Id")!
    expect(sessionId).toBeTruthy()

    // Wait briefly for onFinish async to fire
    await new Promise((r) => setTimeout(r, 50))

    // Reuse session on second request
    const res2 = await app.request("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader(),
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Second message" }],
        sessionId,
      }),
    })
    expect(res2.status).toBe(200)
    expect(res2.headers.get("X-Session-Id")).toBe(sessionId)

    // Wait for onFinish
    await new Promise((r) => setTimeout(r, 50))

    const msgs = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))

    const userMsgs = msgs.filter((m) => m.role === "user")
    expect(userMsgs.length).toBeGreaterThanOrEqual(2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Tool results persistence
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/chat — tool results persistence", () => {
  it("persists tool results as parts in assistant message", async () => {
    mockStreamText.mockImplementationOnce((...args: any[]) => {
      return {
        toUIMessageStreamResponse: (streamOpts?: any) => {
          if (streamOpts?.onFinish) {
            const originalMessages = streamOpts.originalMessages ?? []
            const responseMessage = {
              id: "mock-tool-msg",
              role: "assistant",
              parts: [
                {
                  type: "tool-searchProducts",
                  toolCallId: "call-123",
                  state: "output-available",
                  input: { query: "sneakers" },
                  output: { products: [{ id: "p1", name: "Nike Air" }], totalResults: 1, query: "sneakers" },
                },
                { type: "text", text: "Here are some sneakers!" },
              ],
            }
            setTimeout(() => {
              streamOpts.onFinish({
                messages: [...originalMessages, responseMessage],
                responseMessage,
              })
            }, 10)
          }
          return new Response("mock", { status: 200, headers: { "Content-Type": "text/event-stream" } })
        },
      }
    })

    await seedUser(FAKE_USER_A_CM_ID, FAKE_EMAIL_A, FAKE_WALLET_A, "wlt-a")
    const app = buildApp()
    const res = await app.request("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader() },
      body: JSON.stringify({ messages: [{ role: "user", content: "Find me sneakers" }] }),
    })
    expect(res.status).toBe(200)
    const sessionId = res.headers.get("X-Session-Id")!

    await new Promise((r) => setTimeout(r, 100))

    const msgs = await db.select().from(chatMessages).where(eq(chatMessages.sessionId, sessionId))
    const assistantMsg = msgs.find((m) => m.role === "assistant")
    expect(assistantMsg).toBeDefined()

    const parts = assistantMsg!.parts as any[]
    const toolPart = parts.find((p: any) => p.type === "tool-searchProducts")
    expect(toolPart).toBeDefined()
    expect(toolPart.output.products).toHaveLength(1)

    const textPart = parts.find((p: any) => p.type === "text")
    expect(textPart?.text).toBe("Here are some sneakers!")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Ownership check
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/chat — ownership enforcement", () => {
  it("returns 403 when user A tries to use session owned by user B", async () => {
    // Seed user B and create a session for them
    const userB = await seedUser(FAKE_USER_B_CM_ID, FAKE_EMAIL_B, FAKE_WALLET_B, "wlt-b")
    const [sessionB] = await db
      .insert(chatSessions)
      .values({ userId: userB.id })
      .returning()

    // Seed user A (authenticated requester)
    await seedUser(FAKE_USER_A_CM_ID, FAKE_EMAIL_A, FAKE_WALLET_A, "wlt-a")

    const app = buildApp()
    // getSession still returns user A's crossmint ID
    const res = await app.request("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader(),
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hello" }],
        sessionId: sessionB!.id,
      }),
    })

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.code).toBe("SessionOwnershipError")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Invalid session
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/chat — invalid session", () => {
  it("returns 404 for non-existent sessionId UUID", async () => {
    await seedUser(FAKE_USER_A_CM_ID, FAKE_EMAIL_A, FAKE_WALLET_A, "wlt-a")
    const app = buildApp()
    const res = await app.request("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader(),
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hello" }],
        sessionId: "00000000-0000-0000-0000-000000000000",
      }),
    })

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.code).toBe("SessionNotFound")
  })
})
