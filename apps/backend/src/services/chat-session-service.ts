import { Context, Effect } from "effect";
import type { ChatSession } from "../db/schema/chat-sessions.js";
import type { ChatMessage } from "../db/schema/chat-messages.js";
import type {
  DatabaseError,
  SessionNotFound,
  SessionOwnershipError,
  AIServiceError,
} from "../lib/errors.js";

export interface ChatSessionServiceShape {
  create(
    userId: string,
    title?: string,
  ): Effect.Effect<ChatSession, DatabaseError>;
  list(
    userId: string,
    limit: number,
    offset: number,
  ): Effect.Effect<{ sessions: ChatSession[]; total: number }, DatabaseError>;
  getWithMessages(
    sessionId: string,
    userId: string,
  ): Effect.Effect<
    ChatSession & { messages: ChatMessage[] },
    SessionNotFound | SessionOwnershipError | DatabaseError
  >;
  rename(
    sessionId: string,
    userId: string,
    title: string,
  ): Effect.Effect<
    ChatSession,
    SessionNotFound | SessionOwnershipError | DatabaseError
  >;
  delete(
    sessionId: string,
    userId: string,
  ): Effect.Effect<
    void,
    SessionNotFound | SessionOwnershipError | DatabaseError
  >;
  addMessage(
    sessionId: string,
    msgId: string | undefined,
    role: string,
    parts: unknown,
  ): Effect.Effect<ChatMessage, DatabaseError>;
  saveMessages(
    sessionId: string,
    messages: Array<{ id?: string; role: string; parts: unknown }>,
  ): Effect.Effect<ChatMessage[], DatabaseError>;
  autoTitle(
    sessionId: string,
  ): Effect.Effect<string, DatabaseError | AIServiceError>;
}

export class ChatSessionService extends Context.Tag("ChatSessionService")<
  ChatSessionService,
  ChatSessionServiceShape
>() {}
