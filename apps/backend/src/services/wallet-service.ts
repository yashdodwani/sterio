import { Effect } from "effect"
import { env } from "../lib/env.js"
import { WalletProvisioningError } from "../lib/errors.js"
import logger from "../lib/logger.js"

interface WalletResult {
  address: string
  walletId: string
}

interface CrossmintWalletResponse {
  address?: string
  id?: string
  error?: boolean
  message?: string
}

export const provisionWallet = (
  email: string
): Effect.Effect<WalletResult, WalletProvisioningError> =>
  Effect.tryPromise({
    try: async () => {
      const url = `${env.CROSSMINT_API_URL}/api/2025-06-09/wallets`
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "X-API-KEY": env.CROSSMINT_SERVER_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chainType: "evm",
          linkedUser: `email:${email}`,
          owner: `email:${email}`,
          config: {
            adminSigner: { type: "email", email },
          },
        }),
        signal: AbortSignal.timeout(10_000),
      })

      const data = (await response.json()) as CrossmintWalletResponse

      if (!response.ok || data.error || !data.address) {
        const errMsg = data.message ?? `Wallet provisioning failed: ${response.status}`
        logger.error({ status: response.status, data, email }, errMsg)
        throw new Error(errMsg)
      }

      logger.info({ email }, "Wallet provisioned via Crossmint")
      // Crossmint 2025-06-09 API may not return `id` — fall back to address as wallet locator
      const walletId = data.id || data.address
      return { address: data.address, walletId }
    },
    catch: (cause) => new WalletProvisioningError({ cause }),
  })
