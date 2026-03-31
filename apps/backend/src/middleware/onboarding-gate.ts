import { createMiddleware } from "hono/factory"
import type { AuthVariables } from "./auth.js"

export const onboardingGate = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const step = c.get("onboardingStep")

    if (step < 3) {
      return c.json(
        {
          error: "Onboarding incomplete",
          code: "ONBOARDING_INCOMPLETE",
          step,
        },
        403
      )
    }

    await next()
  }
)
