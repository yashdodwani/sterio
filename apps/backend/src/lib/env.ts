import { z } from "zod";

const envSchema = z.object({
  // Required
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  CROSSMINT_SERVER_API_KEY: z
    .string()
    .min(1, "CROSSMINT_SERVER_API_KEY is required"),

  // Optional — legacy stub auth token (no longer required; Crossmint JWT replaces it)
  AUTH_TOKEN: z.string().optional(),

  // Optional — Crossmint API base URL (defaults to staging)
  CROSSMINT_API_URL: z.string().default("https://staging.crossmint.com"),

  // LLM — OpenRouter as unified provider
  OPENROUTER_API_KEY: z.string().min(1, "OPENROUTER_API_KEY is required"),
  LLM_MODEL: z.string().default("openai/gpt-4o"),

  // Optional — Neon direct endpoint for migrations (falls back to DATABASE_URL)
  DATABASE_URL_DIRECT: z.string().optional(),

  // Optional with defaults
  PORT: z.coerce.number().int().positive().default(3000),
  PRODUCT_SERVICE: z.string().default("mock"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),
  RATE_LIMIT_RPM: z.coerce.number().int().positive().default(30),
  SCRAPING_SERVICE_URL: z.string().default(""),
  SCRAPING_SERVICE_API_KEY: z.string().default(""),

  // Deposit — Polkadot PAS → Base USDC conversion
  PAS_TO_USDC_RATE: z.coerce.number().positive().default(1),
  DEPOSIT_WEBHOOK_SECRET: z.string().default(""),

  // Runtime context
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

/**
 * Parsed and validated environment variables.
 * Validation runs at module import time — fails fast on missing required vars.
 */
export const env = envSchema.parse(process.env);

export type Env = typeof env;
