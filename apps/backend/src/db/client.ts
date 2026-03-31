import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as chatSessionsSchema from "./schema/chat-sessions.js"
import * as chatMessagesSchema from "./schema/chat-messages.js"
import * as usersSchema from "./schema/users.js"
import * as relationsSchema from "./schema/relations.js"
import * as cartItemsSchema from "./schema/cart-items.js"
import * as ordersSchema from "./schema/orders.js"

const DATABASE_URL = process.env.DATABASE_URL!
const DATABASE_URL_DIRECT = process.env.DATABASE_URL_DIRECT ?? DATABASE_URL

// Main pool for queries — reduced max for Neon pooler (PgBouncer handles scaling)
const queryClient = postgres(DATABASE_URL, {
  max: 5,
  idle_timeout: 30,
  max_lifetime: 60 * 30,
})

// Migration client — uses direct endpoint to avoid PgBouncer session issues
const migrationClient = postgres(DATABASE_URL_DIRECT, { max: 1 })

export const db = drizzle(queryClient, {
  schema: { ...chatSessionsSchema, ...chatMessagesSchema, ...usersSchema, ...relationsSchema, ...cartItemsSchema, ...ordersSchema },
  logger: true,
})

export const migrationDb = drizzle(migrationClient)
