import { createCrossmint, CrossmintAuth } from "@crossmint/server-sdk"
import { env } from "./env.js"

const crossmint = createCrossmint({
  apiKey: env.CROSSMINT_SERVER_API_KEY,
})

export const crossmintAuth = CrossmintAuth.from(crossmint)
