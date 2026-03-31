import { Context, Effect, Layer } from "effect"
import Redis from "ioredis"
import { CacheError, CacheNotFound } from "../lib/errors.js"

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

export interface CacheServiceShape {
  get(key: string): Effect.Effect<string, CacheNotFound | CacheError>
  set(key: string, value: string, ttlSeconds: number): Effect.Effect<void, CacheError>
  del(key: string): Effect.Effect<void, CacheError>
  health(): Effect.Effect<boolean, CacheError>
}

// ---------------------------------------------------------------------------
// Context tag
// ---------------------------------------------------------------------------

export class CacheService extends Context.Tag("CacheService")<
  CacheService,
  CacheServiceShape
>() {}

// ---------------------------------------------------------------------------
// Live implementation
// ---------------------------------------------------------------------------

export const CacheServiceLive = Layer.effect(
  CacheService,
  Effect.sync(() => {
    const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      enableReadyCheck: true,
    })

    const get = (key: string): Effect.Effect<string, CacheNotFound | CacheError> =>
      Effect.tryPromise({
        try: () => redis.get(key),
        catch: (cause) => new CacheError({ cause }),
      }).pipe(
        Effect.flatMap((value) =>
          value === null
            ? Effect.fail(new CacheNotFound({ key }))
            : Effect.succeed(value)
        )
      )

    const set = (
      key: string,
      value: string,
      ttlSeconds: number
    ): Effect.Effect<void, CacheError> =>
      Effect.tryPromise({
        try: () => redis.set(key, value, "EX", ttlSeconds),
        catch: (cause) => new CacheError({ cause }),
      }).pipe(Effect.asVoid)

    const del = (key: string): Effect.Effect<void, CacheError> =>
      Effect.tryPromise({
        try: () => redis.del(key),
        catch: (cause) => new CacheError({ cause }),
      }).pipe(Effect.asVoid)

    const health = (): Effect.Effect<boolean, CacheError> =>
      Effect.tryPromise({
        try: () => redis.ping(),
        catch: (cause) => new CacheError({ cause }),
      }).pipe(Effect.map((result) => result === "PONG"))

    return { get, set, del, health }
  })
)
