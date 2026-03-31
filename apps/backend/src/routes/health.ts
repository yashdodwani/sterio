import { Hono } from "hono"
import { Effect } from "effect"
import { db } from "../db/client.js"
import { CacheService, CacheServiceLive } from "../services/cache-service.js"
import { env } from "../lib/env.js"
import { sql } from "drizzle-orm"

const health = new Hono()

health.get("/", async (c) => {
  const startTime = process.uptime()

  // Check PostgreSQL
  let dbStatus: "connected" | "error" = "error"
  try {
    await db.execute(sql`SELECT 1`)
    dbStatus = "connected"
  } catch {
    dbStatus = "error"
  }

  // Check Redis via CacheService
  let redisStatus: "connected" | "error" = "error"
  const redisCheck = await Effect.runPromise(
    Effect.gen(function* () {
      const cache = yield* CacheService
      return yield* cache.health()
    }).pipe(
      Effect.provide(CacheServiceLive),
      Effect.orElse(() => Effect.succeed(false))
    )
  )
  if (redisCheck) redisStatus = "connected"

  const allHealthy = dbStatus === "connected" && redisStatus === "connected"

  return c.json(
    {
      status: allHealthy ? "ok" : "degraded",
      services: {
        database: dbStatus,
        redis: redisStatus,
        productService: env.PRODUCT_SERVICE,
      },
      uptime: Math.floor(startTime),
    },
    allHealthy ? 200 : 503
  )
})

export { health as healthRoute }
