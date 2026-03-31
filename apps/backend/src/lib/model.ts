import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import type { LanguageModel } from "ai"
import { env } from "./env.js"

/**
 * AI model instance via OpenRouter.
 * Uses the dedicated @openrouter/ai-sdk-provider (v2.3.1+) which fixes
 * streaming tool-call lifecycle events that were broken with the generic
 * @ai-sdk/openai + custom baseURL approach.
 * Model is selected via LLM_MODEL env var (e.g. "openai/gpt-4o", "anthropic/claude-sonnet-4").
 */
const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
})

export const model: LanguageModel = openrouter.chat(env.LLM_MODEL)
