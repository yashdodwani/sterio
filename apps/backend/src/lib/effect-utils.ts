import { Effect } from "effect"

/**
 * Run an Effect that has no remaining requirements, returning an Either.
 * Shared by route handlers to safely unwrap service results.
 */
export function runService<A, E>(eff: Effect.Effect<A, E, never>) {
  return Effect.runPromise(Effect.either(eff))
}
