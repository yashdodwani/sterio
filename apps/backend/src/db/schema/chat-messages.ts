import { pgTable, uuid, varchar, jsonb, timestamp, index } from "drizzle-orm/pg-core"
import { chatSessions } from "./chat-sessions"

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    msgId: varchar("msg_id", { length: 100 }), // UIMessage.id from AI SDK
    role: varchar("role", { length: 20 }).notNull(), // 'user' | 'assistant' | 'system' | 'tool'
    parts: jsonb("parts").notNull(), // UIMessage.parts[] as JSONB
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_chat_messages_session_id").on(table.sessionId),
  ],
)

export type ChatMessage = typeof chatMessages.$inferSelect
export type NewChatMessage = typeof chatMessages.$inferInsert
