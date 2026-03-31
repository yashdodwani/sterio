import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import { eq, and, gte, sql } from "drizzle-orm"
import { db } from "../db/client.js"
import { users } from "../db/schema/users.js"
import type { AuthVariables } from "../middleware/auth.js"
import {
  OnboardingStep1Schema,
  OnboardingStep2Schema,
  OnboardingStep3Schema,
  OnboardingStepResponseSchema,
  OnboardingStatusSchema,
  errorResponse,
  commonErrors,
  validationHook,
} from "../lib/openapi-schemas.js"

const security = [{ CookieAuth: [] }]

// ─── Route definitions ──────────────────────────────────────────────────────

const statusRoute = createRoute({
  method: "get",
  path: "/status",
  tags: ["Onboarding"],
  security,
  summary: "Get onboarding status",
  responses: {
    200: {
      content: { "application/json": { schema: OnboardingStatusSchema } },
      description: "Current onboarding status",
    },
    ...commonErrors,
  },
})

const step1Route = createRoute({
  method: "post",
  path: "/step-1",
  tags: ["Onboarding"],
  security,
  summary: "Step 1: Set display name",
  request: {
    body: { content: { "application/json": { schema: OnboardingStep1Schema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: OnboardingStepResponseSchema } },
      description: "Step 1 completed",
    },
    ...errorResponse(400, "Validation error"),
    ...commonErrors,
  },
})

const step2Route = createRoute({
  method: "post",
  path: "/step-2",
  tags: ["Onboarding"],
  security,
  summary: "Step 2: Set shipping address",
  request: {
    body: { content: { "application/json": { schema: OnboardingStep2Schema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: OnboardingStepResponseSchema } },
      description: "Step 2 completed",
    },
    ...errorResponse(400, "Validation error"),
    ...errorResponse(403, "Previous step not completed"),
    ...commonErrors,
  },
})

const step3Route = createRoute({
  method: "post",
  path: "/step-3",
  tags: ["Onboarding"],
  security,
  summary: "Step 3: Set clothing sizes",
  request: {
    body: { content: { "application/json": { schema: OnboardingStep3Schema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: OnboardingStepResponseSchema } },
      description: "Step 3 completed — onboarding finished",
    },
    ...errorResponse(400, "Validation error"),
    ...errorResponse(403, "Previous step not completed"),
    ...commonErrors,
  },
})

// ─── Handlers ───────────────────────────────────────────────────────────────

export const onboardingRoute = new OpenAPIHono<{ Variables: AuthVariables }>({
  defaultHook: validationHook,
})

onboardingRoute.openapi(statusRoute, (c) => {
  const step = c.get("onboardingStep")
  return c.json({ step, completed: step >= 3 })
})

onboardingRoute.openapi(step1Route, async (c) => {
  const userId = c.get("userId")
  const { displayName } = c.req.valid("json")

  // Use GREATEST so re-submitting step-1 never regresses the step counter
  await db
    .update(users)
    .set({
      displayName,
      onboardingStep: sql`GREATEST(${users.onboardingStep}, 1)`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))

  return c.json({ success: true, step: 1 })
})

onboardingRoute.openapi(step2Route, async (c) => {
  const userId = c.get("userId")
  const data = c.req.valid("json")

  // Conditional UPDATE — only succeeds if step >= 1
  const result = await db
    .update(users)
    .set({
      firstName: data.firstName,
      lastName: data.lastName,
      street: data.street,
      apt: data.apt ?? null,
      country: data.country,
      city: data.city,
      state: data.state ?? null,
      zip: data.zip,
      onboardingStep: sql`GREATEST(${users.onboardingStep}, 2)`,
      updatedAt: new Date(),
    })
    .where(and(eq(users.id, userId), gte(users.onboardingStep, 1)))
    .returning({ id: users.id })

  if (result.length === 0) {
    return c.json({ error: "Complete step 1 first", code: "STEP_NOT_REACHED" }, 403) as never
  }

  return c.json({ success: true, step: 2 })
})

onboardingRoute.openapi(step3Route, async (c) => {
  const userId = c.get("userId")
  const { topsSize, bottomsSize, footwearSize } = c.req.valid("json")

  // Conditional UPDATE — only succeeds if step >= 2
  const result = await db
    .update(users)
    .set({
      topsSize,
      bottomsSize,
      footwearSize,
      onboardingStep: 3,
      updatedAt: new Date(),
    })
    .where(and(eq(users.id, userId), gte(users.onboardingStep, 2)))
    .returning({ id: users.id })

  if (result.length === 0) {
    return c.json({ error: "Complete step 2 first", code: "STEP_NOT_REACHED" }, 403) as never
  }

  return c.json({ success: true, step: 3 })
})
