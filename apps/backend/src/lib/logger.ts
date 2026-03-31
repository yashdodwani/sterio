import pino from "pino"
import { env } from "./env.js"

const isProduction = env.NODE_ENV === "production"

/**
 * Factory that creates a Pino logger bound to a service name.
 * - Production: raw JSON to stdout
 * - Development/test: pino-pretty with colorized output
 */
export function createLogger(service: string): pino.Logger {
  const level = env.LOG_LEVEL

  if (isProduction) {
    return pino({
      level,
      base: { service },
      timestamp: pino.stdTimeFunctions.isoTime,
    })
  }

  return pino({
    level,
    base: { service },
    timestamp: pino.stdTimeFunctions.isoTime,
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:HH:MM:ss",
        ignore: "pid,hostname",
      },
    },
  })
}

/**
 * Default logger instance for the comagent service.
 * Import and use directly, or call `.child({ requestId })` for request-scoped logging.
 *
 * @example
 * import logger from "@/lib/logger"
 * const reqLog = logger.child({ requestId: "abc-123" })
 */
const logger = createLogger("comagent")

export default logger
