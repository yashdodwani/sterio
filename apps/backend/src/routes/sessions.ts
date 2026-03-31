import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { Effect, Layer } from "effect";
import { ChatSessionService } from "../services/chat-session-service.js";
import type { AuthVariables } from "../middleware/auth.js";
import {
  ChatSessionSchema,
  SessionWithMessagesSchema,
  SessionListSchema,
  SessionIdParamSchema,
  commonErrors,
  errorResponse,
  validationHook,
} from "../lib/openapi-schemas.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function taggedErrorToStatus(tag: string): 404 | 403 | 500 {
  if (tag === "SessionNotFound") return 404;
  if (tag === "SessionOwnershipError") return 403;
  return 500;
}

function runService<A, E>(eff: Effect.Effect<A, E, never>) {
  return Effect.runPromise(Effect.either(eff));
}

// ---------------------------------------------------------------------------
// Route definitions
// ---------------------------------------------------------------------------

const security = [{ CookieAuth: [] }];

const createSessionRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Sessions"],
  security,
  summary: "Create a chat session",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({ title: z.string().min(1).max(255).optional() }),
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: ChatSessionSchema } },
      description: "Session created",
    },
    ...errorResponse(400, "Invalid request body"),
    ...commonErrors,
  },
});

const listSessionsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Sessions"],
  security,
  summary: "List chat sessions",
  request: {
    query: z.object({
      limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20)
        .openapi({ example: 20 }),
      offset: z.coerce.number().int().min(0).default(0).openapi({ example: 0 }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: SessionListSchema } },
      description: "Session list",
    },
    ...commonErrors,
  },
});

const getSessionRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Sessions"],
  security,
  summary: "Get session with messages",
  request: { params: SessionIdParamSchema },
  responses: {
    200: {
      content: { "application/json": { schema: SessionWithMessagesSchema } },
      description: "Session with messages",
    },
    ...errorResponse(400, "Invalid session id"),
    ...errorResponse(403, "Forbidden — not the session owner"),
    ...errorResponse(404, "Session not found"),
    ...commonErrors,
  },
});

const renameSessionRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Sessions"],
  security,
  summary: "Rename a session",
  request: {
    params: SessionIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: z.object({ title: z.string().min(1).max(255) }),
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: ChatSessionSchema } },
      description: "Session renamed",
    },
    ...errorResponse(400, "Invalid request body or id"),
    ...errorResponse(403, "Forbidden — not the session owner"),
    ...errorResponse(404, "Session not found"),
    ...commonErrors,
  },
});

const deleteSessionRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Sessions"],
  security,
  summary: "Delete a session",
  request: { params: SessionIdParamSchema },
  responses: {
    204: { description: "Session deleted" },
    ...errorResponse(403, "Forbidden — not the session owner"),
    ...errorResponse(404, "Session not found"),
    ...commonErrors,
  },
});

// ---------------------------------------------------------------------------
// Route factory
// ---------------------------------------------------------------------------

export function createSessionRoutes(layer: Layer.Layer<ChatSessionService>) {
  const app = new OpenAPIHono<{ Variables: AuthVariables }>({
    defaultHook: validationHook,
  });

  app.openapi(createSessionRoute, async (c) => {
    const userId = c.get("userId");
    const { title } = c.req.valid("json");
    const result = await runService(
      ChatSessionService.pipe(
        Effect.flatMap((s) => s.create(userId, title)),
        Effect.provide(layer),
      ),
    );
    if (result._tag === "Left") {
      const err = result.left as { _tag: string; message?: string };
      return c.json(
        { error: err.message ?? "Failed to create session", code: err._tag },
        500,
      ) as never;
    }
    return c.json(result.right as any, 201);
  });

  app.openapi(listSessionsRoute, async (c) => {
    const userId = c.get("userId");
    const { limit, offset } = c.req.valid("query");
    const result = await runService(
      ChatSessionService.pipe(
        Effect.flatMap((s) => s.list(userId, limit, offset)),
        Effect.provide(layer),
      ),
    );
    if (result._tag === "Left") {
      const err = result.left as { _tag: string; message?: string };
      return c.json(
        { error: err.message ?? "Failed to list sessions", code: err._tag },
        500,
      ) as never;
    }
    return c.json(result.right as any, 200);
  });

  app.openapi(getSessionRoute, async (c) => {
    const userId = c.get("userId");
    const { id } = c.req.valid("param");
    const result = await runService(
      ChatSessionService.pipe(
        Effect.flatMap((s) => s.getWithMessages(id, userId)),
        Effect.provide(layer),
      ),
    );
    if (result._tag === "Left") {
      const err = result.left as { _tag: string; message?: string };
      return c.json(
        { error: err.message ?? "Session error", code: err._tag },
        taggedErrorToStatus(err._tag),
      ) as never;
    }
    // Transform DB rows → UIMessage-compatible shape
    const { messages, ...session } = result.right;
    const uiMessages = messages.map((m) => ({
      id: m.msgId ?? m.id,  // prefer SDK msgId, fallback to DB UUID
      role: m.role,
      parts: m.parts,
      createdAt: m.createdAt,
    }));

    return c.json({ ...session, messages: uiMessages } as any, 200);
  });

  app.openapi(renameSessionRoute, async (c) => {
    const userId = c.get("userId");
    const { id } = c.req.valid("param");
    const { title } = c.req.valid("json");
    const result = await runService(
      ChatSessionService.pipe(
        Effect.flatMap((s) => s.rename(id, userId, title)),
        Effect.provide(layer),
      ),
    );
    if (result._tag === "Left") {
      const err = result.left as { _tag: string; message?: string };
      return c.json(
        { error: err.message ?? "Session error", code: err._tag },
        taggedErrorToStatus(err._tag),
      ) as never;
    }
    return c.json(result.right as any, 200);
  });

  app.openapi(deleteSessionRoute, async (c) => {
    const userId = c.get("userId");
    const { id } = c.req.valid("param");
    const result = await runService(
      ChatSessionService.pipe(
        Effect.flatMap((s) => s.delete(id, userId)),
        Effect.provide(layer),
      ),
    );
    if (result._tag === "Left") {
      const err = result.left as { _tag: string; message?: string };
      return c.json(
        { error: err.message ?? "Session error", code: err._tag },
        taggedErrorToStatus(err._tag),
      ) as never;
    }
    return new Response(null, { status: 204 }) as never;
  });

  return app;
}
