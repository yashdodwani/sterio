import { Effect } from "effect"
import { eq } from "drizzle-orm"
import { crossmintAuth } from "../lib/crossmint.js"
import { db } from "../db/client.js"
import { users } from "../db/schema/users.js"
import { provisionWallet } from "../services/wallet-service.js"
import logger from "../lib/logger.js"

type ProvisionResult =
  | { ok: true; userId: string; email: string }
  | { ok: false; status: number; error: string; code: string }

/**
 * Provisions a new user: fetch Crossmint profile, insert DB row, provision wallet.
 * Returns `{ ok: true, userId, email }` on success or `{ ok: false, status, error, code }` on failure.
 */
export async function provisionNewUser(crossmintUserId: string, emailHint?: string): Promise<ProvisionResult> {
  // Resolve email: try hint (from session cookie), then Crossmint getUser API
  let email: string = emailHint ?? ""
  if (!email) {
    try {
      const profile = await crossmintAuth.getUser(crossmintUserId) as { email?: string }
      email = profile.email ?? ""
    } catch (err) {
      logger.error({ err, crossmintUserId }, "Failed to fetch user profile")
    }
  }
  if (!email) {
    logger.error({ crossmintUserId, event: "provision_no_email" }, "No email available for user provisioning")
    return { ok: false, status: 500, error: "User profile missing email", code: "NO_EMAIL" }
  }

  // Insert pending user row (ON CONFLICT DO NOTHING handles concurrent requests)
  let internalUserId: string | undefined
  try {
    const inserted = await db
      .insert(users)
      .values({ crossmintUserId, email, walletStatus: "pending" })
      .onConflictDoNothing()
      .returning({ id: users.id })

    internalUserId =
      inserted[0]?.id ??
      (
        await db.query.users?.findFirst({
          where: eq(users.crossmintUserId, crossmintUserId),
        })
      )?.id
  } catch (err) {
    logger.error({ err, crossmintUserId, email, event: "user_insert_failed" }, "DB insert failed")
    return { ok: false, status: 500, error: "Internal Server Error", code: "USER_CREATE_FAILED" }
  }

  if (!internalUserId) {
    return { ok: false, status: 500, error: "Internal Server Error", code: "USER_CREATE_FAILED" }
  }

  // Provision wallet via Effect
  const walletResult = await Effect.runPromise(Effect.either(provisionWallet(email)))

  if (walletResult._tag === "Left") {
    const err = walletResult.left
    logger.error(
      {
        crossmintUserId,
        cause: err.cause instanceof Error ? err.cause.message : String(err.cause),
        event: "wallet_provision_failed",
      },
      "Wallet provisioning failed — rolling back user row"
    )
    try {
      await db.delete(users).where(eq(users.id, internalUserId))
    } catch (delErr) {
      logger.error({ err: delErr, internalUserId }, "Failed to rollback user row")
    }
    return { ok: false, status: 503, error: "Service Unavailable", code: "WALLET_PROVISION_FAILED" }
  }

  const { address, walletId } = walletResult.right

  try {
    await db
      .update(users)
      .set({
        walletAddress: address,
        crossmintWalletId: walletId,
        walletStatus: "active",
        updatedAt: new Date(),
      })
      .where(eq(users.id, internalUserId))
  } catch (err) {
    logger.error({ err, internalUserId, event: "wallet_update_failed" }, "Failed to update user with wallet")
    return { ok: false, status: 500, error: "Internal Server Error", code: "WALLET_UPDATE_FAILED" }
  }

  return { ok: true, userId: internalUserId, email }
}
