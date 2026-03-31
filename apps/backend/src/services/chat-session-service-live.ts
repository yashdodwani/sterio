import { Effect, Layer } from "effect"
import { eq, and, desc, count, asc } from "drizzle-orm"
import { generateText } from "ai"
import { model } from "../lib/model.js"
import { db } from "../db/client.js"
import { chatSessions } from "../db/schema/chat-sessions.js"
import { chatMessages } from "../db/schema/chat-messages.js"
import { DatabaseError, SessionNotFound, SessionOwnershipError, AIServiceError } from "../lib/errors.js"
import { extractTextFromParts } from "../lib/message-utils.js"
import { ChatSessionService } from "./chat-session-service.js"
import type { ChatSession } from "../db/schema/chat-sessions.js"

const dbError = (cause: unknown) => new DatabaseError({ cause })

const assertOwnership = (
  sessionId: string,
  userId: string,
): Effect.Effect<ChatSession, SessionNotFound | SessionOwnershipError | DatabaseError> =>
  Effect.tryPromise({
    try: () =>
      db
        .select()
        .from(chatSessions)
        .where(eq(chatSessions.id, sessionId))
        .limit(1)
        .then((rows) => rows[0]),
    catch: dbError,
  }).pipe(
    Effect.flatMap(
      (session): Effect.Effect<ChatSession, SessionNotFound | SessionOwnershipError> => {
        if (!session) return Effect.fail(new SessionNotFound({ sessionId }))
        if (session.userId !== userId) return Effect.fail(new SessionOwnershipError({ sessionId }))
        return Effect.succeed(session)
      },
    ),
  )

const impl: import("./chat-session-service.js").ChatSessionServiceShape = {
  create: (userId, title) =>
    Effect.tryPromise({
      try: () =>
        db
          .insert(chatSessions)
          .values({ userId, title: title ?? null })
          .returning()
          .then((rows) => rows[0]),
      catch: dbError,
    }),

  list: (userId, limit, offset) =>
    Effect.tryPromise({
      try: async () => {
        const [sessions, [{ value: total }]] = await Promise.all([
          db
            .select()
            .from(chatSessions)
            .where(eq(chatSessions.userId, userId))
            .orderBy(desc(chatSessions.updatedAt))
            .limit(limit)
            .offset(offset),
          db
            .select({ value: count() })
            .from(chatSessions)
            .where(eq(chatSessions.userId, userId)),
        ])
        return { sessions, total: Number(total) }
      },
      catch: dbError,
    }),

  getWithMessages: (sessionId, userId) =>
    assertOwnership(sessionId, userId).pipe(
      Effect.flatMap((session) =>
        Effect.tryPromise({
          try: () =>
            db
              .select()
              .from(chatMessages)
              .where(eq(chatMessages.sessionId, sessionId))
              .orderBy(asc(chatMessages.createdAt)),
          catch: dbError,
        }).pipe(Effect.map((messages) => ({ ...session, messages }))),
      ),
    ),

  rename: (sessionId, userId, title) =>
    assertOwnership(sessionId, userId).pipe(
      Effect.flatMap(() =>
        Effect.tryPromise({
          try: () =>
            db
              .update(chatSessions)
              .set({ title, updatedAt: new Date() })
              .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)))
              .returning()
              .then((rows) => rows[0] as ChatSession | undefined),
          catch: dbError,
        }),
      ),
      Effect.flatMap((row) =>
        row ? Effect.succeed(row) : Effect.fail(new SessionNotFound({ sessionId })),
      ),
    ),

  delete: (sessionId, userId) =>
    assertOwnership(sessionId, userId).pipe(
      Effect.flatMap(() =>
        Effect.tryPromise({
          try: () =>
            db
              .delete(chatSessions)
              .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId))),
          catch: dbError,
        }),
      ),
      Effect.map(() => undefined),
    ),

  addMessage: (sessionId, msgId, role, parts) =>
    Effect.tryPromise({
      try: async () => {
        const [[message]] = await Promise.all([
          db.insert(chatMessages).values({ sessionId, msgId: msgId ?? null, role, parts }).returning(),
          db.update(chatSessions).set({ updatedAt: new Date() }).where(eq(chatSessions.id, sessionId)),
        ])
        return message
      },
      catch: dbError,
    }),

  saveMessages: (sessionId, messages) =>
    Effect.tryPromise({
      try: async () => {
        const [rows] = await Promise.all([
          db.insert(chatMessages).values(messages.map((m) => ({ sessionId, msgId: m.id ?? null, role: m.role, parts: m.parts }))).returning(),
          db.update(chatSessions).set({ updatedAt: new Date() }).where(eq(chatSessions.id, sessionId)),
        ])
        return rows
      },
      catch: dbError,
    }),

  autoTitle: (sessionId) =>
    Effect.tryPromise({
      try: () =>
        db
          .select()
          .from(chatMessages)
          .where(eq(chatMessages.sessionId, sessionId))
          .orderBy(asc(chatMessages.createdAt))
          .limit(3),
      catch: dbError,
    }).pipe(
      Effect.flatMap((messages) =>
        Effect.tryPromise({
          try: async () => {
            const preview = messages
              .map((m) => `${m.role}: ${extractTextFromParts(m.parts)}`)
              .join("\n")
            const { text } = await generateText({
              model,
              prompt: `Generate a short title (max 50 characters) for this chat session based on these messages:\n\n${preview}\n\nRespond with only the title, no quotes or punctuation.`,
              maxOutputTokens: 20,
            })
            const title = text.trim().slice(0, 50)
            await db
              .update(chatSessions)
              .set({ title, updatedAt: new Date() })
              .where(eq(chatSessions.id, sessionId))
            return title
          },
          catch: (cause) => new AIServiceError({ cause }),
        }),
      ),
    ),
}

export const ChatSessionServiceLive = Layer.succeed(ChatSessionService, impl)
