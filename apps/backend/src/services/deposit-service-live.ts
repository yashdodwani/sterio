import { Effect, Layer } from "effect"
import BigNumber from "bignumber.js"
import { eq, and, sql } from "drizzle-orm"
import { db } from "../db/client.js"
import { users } from "../db/schema/users.js"
import { orders } from "../db/schema/orders.js"
import {
  DatabaseError,
  DepositDuplicateError,
  DepositUserNotFoundError,
} from "../lib/errors.js"
import { fundCrossmintWallet } from "../lib/crossmint-client.js"
import { env } from "../lib/env.js"
import { DepositService } from "./deposit-service.js"
import type { DepositServiceShape } from "./deposit-service.js"
import logger from "../lib/logger.js"

const dbError = (cause: unknown) => new DatabaseError({ cause })

const impl: DepositServiceShape = {
  confirmDeposit: (userId, address, amountPAS, transactionHash) =>
    Effect.gen(function* () {
      // 1. Fetch user
      const user = yield* Effect.tryPromise({
        try: () =>
          db
            .select()
            .from(users)
            .where(and(eq(users.id, userId), sql`lower(${users.walletAddress}) = ${address.toLowerCase()}`))
            .then((rows) => rows[0] ?? null),
        catch: dbError,
      })

      if (!user) {
        return yield* Effect.fail(new DepositUserNotFoundError({ userId, address }))
      }

      // 2. Convert PAS planck → USDC ether using BigNumber
      //    PAS has 10 decimals (planck), USDC has 6 decimals (micro)
      //    amountPAS is raw planck string, e.g. "1000000000000" = 100 PAS
      const PAS_DECIMALS = 10
      const USDC_DECIMALS = 6
      const pasHuman = new BigNumber(amountPAS).shiftedBy(-PAS_DECIMALS)
      const usdcHuman = pasHuman.multipliedBy(env.PAS_TO_USDC_RATE)
      // Ether form = human-readable decimal (what Crossmint staging faucet expects)
      // Crossmint fund API caps at 100 USDXM per call
      const usdcEther = Math.min(usdcHuman.toNumber(), 100)
      const amountPasStr = pasHuman.toFixed(PAS_DECIMALS)
      const amountUsdcStr = usdcHuman.toFixed(USDC_DECIMALS)

      // 3. Fund wallet via Crossmint staging faucet (expects ether form, not wei)
      const walletLocator = `email:${user.email}:evm-smart-wallet`
      yield* fundCrossmintWallet(walletLocator, usdcEther)

      // 4. Insert deposit order record (unique constraint on polkadot_tx_hash guards duplicates)
      const depositOrder = yield* Effect.tryPromise({
        try: () =>
          db
            .insert(orders)
            .values({
              userId,
              type: "deposit",
              amountPas: amountPasStr,
              amountUsdc: amountUsdcStr,
              polkadotTxHash: transactionHash,
            })
            .returning()
            .then((rows) => rows[0]),
        catch: (cause) => {
          // Handle unique constraint violation on polkadot_tx_hash
          const msg = String(cause)
          if (msg.includes("idx_orders_polkadot_tx_hash") || msg.includes("unique")) {
            return new DepositDuplicateError({ transactionHash })
          }
          return new DatabaseError({ cause })
        },
      })

      logger.info(
        { userId, orderId: depositOrder.id, amountPas: amountPasStr, amountUsdc: amountUsdcStr, transactionHash },
        "Deposit funded and recorded"
      )

      return {
        orderId: depositOrder.id,
        amountPAS: amountPasStr,
        amountUSDC: amountUsdcStr,
        crossmintFundingStatus: "funded" as const,
      }
    }),
}

export const DepositServiceLive = Layer.succeed(DepositService, impl)
