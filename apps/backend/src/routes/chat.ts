import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { streamText, convertToModelMessages, stepCountIs, createIdGenerator, type UIMessage } from "ai";
import { model } from "../lib/model.js";
import { Effect, Layer } from "effect";
import { systemPrompt } from "../lib/chat-system-prompt.js";
import { makeProductTools } from "../services/product-tools.js";
import { ProductService } from "../services/product-service.js";
import { ChatSessionService } from "../services/chat-session-service.js";
import type { AuthVariables } from "../middleware/auth.js";
import logger from "../lib/logger.js";
import {
  ErrorSchema,
  errorResponse,
  commonErrors,
  validationHook,
} from "../lib/openapi-schemas.js";

// ---------------------------------------------------------------------------
// Helper: convert DB parts or plain content → UIMessage for AI SDK v6
// ---------------------------------------------------------------------------

function toUIMessage(msgId: string | null, role: string, parts: unknown): UIMessage {
  const id = msgId ?? crypto.randomUUID()
  if (Array.isArray(parts) && parts.length > 0 && parts[0]?.type) {
    const converted = parts.map((p: any) => {
      if (p.type === "tool-invocation" && p.toolInvocation) {
        const ti = p.toolInvocation
        return {
          type: `tool-${ti.toolName}`,
          toolCallId: ti.toolCallId,
          state: ti.state === "result" ? "output-available" : ti.state,
          input: ti.args ?? {},
          output: ti.result ?? null,
        }
      }
      return p
    })
    return { id, role: role as UIMessage["role"], parts: converted }
  }
  return {
    id,
    role: role as UIMessage["role"],
    parts: [{ type: "text", text: typeof parts === "string" ? parts : JSON.stringify(parts) }],
  }
}

// ---------------------------------------------------------------------------
// Request schema
// ---------------------------------------------------------------------------

const messageSchema = z
  .object({
    role: z.enum(["user", "assistant", "system", "data"]),
    content: z.unknown(),
  })
  .passthrough();

const chatRequestSchema = z.object({
  messages: z
    .array(messageSchema)
    .min(1)
    .openapi({ description: "At least one message is required" }),
  sessionId: z.string().uuid().optional(),
});

// ---------------------------------------------------------------------------
// Route definition
// ---------------------------------------------------------------------------

const postChatRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Chat"],
  security: [{ CookieAuth: [] }],
  summary: "Send a chat message and stream LLM response",
  request: {
    body: {
      content: { "application/json": { schema: chatRequestSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "text/event-stream": { schema: z.string() } },
      description: "Streamed LLM response with X-Session-Id header",
    },
    ...errorResponse(400, "Bad request — validation error"),
    ...errorResponse(403, "Forbidden — session owned by another user"),
    ...errorResponse(404, "Session not found"),
    ...commonErrors,
  },
});

// ---------------------------------------------------------------------------
// Route factory — binds ProductService and ChatSessionService layers at startup
// ---------------------------------------------------------------------------

export function createChatRoute(
  productServiceLayer: Layer.Layer<ProductService>,
  sessionServiceLayer: Layer.Layer<ChatSessionService>,
) {
  const tools = makeProductTools(productServiceLayer);
  const chat = new OpenAPIHono<{ Variables: AuthVariables }>({
    defaultHook: validationHook,
  });

  // Helper: run a ChatSessionService effect, returning Either
  const runSession = <A, E>(effect: Effect.Effect<A, E, ChatSessionService>) =>
    Effect.runPromise(
      effect.pipe(Effect.provide(sessionServiceLayer), Effect.either),
    );

  chat.openapi(postChatRoute, async (c) => {
    const userId = c.get("userId");
    const { messages, sessionId: reqSessionId } = c.req.valid("json");

    // ------------------------------------------------------------------
    // Session resolution
    // ------------------------------------------------------------------
    let sessionId: string;
    let existingUIMessages: UIMessage[] = [];

    if (!reqSessionId) {
      const createResult = await runSession(
        ChatSessionService.pipe(Effect.flatMap((s) => s.create(userId))),
      );
      if (createResult._tag === "Left") {
        const err = createResult.left as { _tag: string; message?: string };
        logger.error({ err, userId }, "Failed to create chat session");
        return c.json(
          { error: "Failed to create session", code: err._tag },
          500,
        );
      }
      sessionId = createResult.right.id;
    } else {
      const getResult = await runSession(
        ChatSessionService.pipe(
          Effect.flatMap((s) => s.getWithMessages(reqSessionId, userId)),
        ),
      );
      if (getResult._tag === "Left") {
        const err = getResult.left as { _tag: string; message?: string };
        if (err._tag === "SessionNotFound") {
          return c.json({ error: "Session not found", code: err._tag }, 404);
        }
        if (err._tag === "SessionOwnershipError") {
          return c.json({ error: "Forbidden", code: err._tag }, 403);
        }
        return c.json({ error: "Session error", code: err._tag }, 500);
      }
      sessionId = reqSessionId;
      existingUIMessages = getResult.right.messages.map((m) =>
        toUIMessage(m.msgId ?? null, m.role, m.parts),
      );
    }

    // ------------------------------------------------------------------
    // Build UIMessage array: DB history + new user message
    // ------------------------------------------------------------------

    const generateMessageId = createIdGenerator({ prefix: "msg", size: 16 });

    const lastMsg = messages[messages.length - 1];
    const rawContent = (lastMsg as any).content ?? "";
    const userUIMessage: UIMessage = {
      id: generateMessageId(),
      role: "user",
      parts: [{ type: "text", text: typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent) }],
    };
    const allUIMessages = [...existingUIMessages, userUIMessage];

    // ------------------------------------------------------------------
    // Stream LLM response
    // ------------------------------------------------------------------
    const result = streamText({
      model,
      system: systemPrompt,
      messages: await convertToModelMessages(allUIMessages, { ignoreIncompleteToolCalls: true }),
      tools,
      stopWhen: stepCountIs(3),
      onStepFinish: async ({ toolCalls, toolResults }) => {
        // LOGGING ONLY — persistence handled in toUIMessageStreamResponse.onFinish
        for (const tc of toolCalls as any[]) {
          logger.info(
            { sessionId, tool: tc.toolName, toolCallId: tc.toolCallId, args: tc.args },
            `Tool call: ${tc.toolName}`,
          )
        }
        for (const tr of toolResults as any[]) {
          const r = tr.result
          const productCount = r?.products?.length ?? (r?.id ? 1 : 0)
          logger.info(
            { sessionId, tool: tr.toolName, toolCallId: tr.toolCallId, productCount },
            `Tool result: ${tr.toolName}`,
          )
        }
      },
    });

    // ------------------------------------------------------------------
    // Return stream — persist all messages atomically in onFinish
    // ------------------------------------------------------------------
    const response = result.toUIMessageStreamResponse({
      originalMessages: allUIMessages,
      generateMessageId,
      onFinish: async ({ messages: finalMessages }) => {
        try {
          // New messages = everything after the original history + user message
          const newMessages = finalMessages.slice(allUIMessages.length);
          const toPersist = [userUIMessage, ...newMessages];

          await Effect.runPromise(
            ChatSessionService.pipe(
              Effect.flatMap((s) =>
                s.saveMessages(
                  sessionId,
                  toPersist.map((m) => ({ id: m.id, role: m.role, parts: m.parts })),
                ),
              ),
              Effect.provide(sessionServiceLayer),
            ),
          );

          // Auto-title on first exchange
          const totalMessages = existingUIMessages.length + toPersist.length;
          if (totalMessages <= 2) {
            await Effect.runPromise(
              ChatSessionService.pipe(
                Effect.flatMap((s) => s.autoTitle(sessionId)),
                Effect.provide(sessionServiceLayer),
                Effect.either,
              ),
            );
          }
        } catch (err) {
          logger.error({ err, sessionId }, "Failed to persist messages");
        }
      },
    });

    response.headers.set("X-Session-Id", sessionId);
    return response;
  });

  return chat;
}
