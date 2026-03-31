import {
  pgTable,
  uuid,
  varchar,
  numeric,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { users } from "./users"

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 20 }).notNull().default("checkout"),
    crossmintOrderId: varchar("crossmint_order_id", { length: 255 }),
    amountPas: numeric("amount_pas"),
    amountUsdc: numeric("amount_usdc"),
    polkadotTxHash: varchar("polkadot_tx_hash", { length: 255 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_orders_user_id").on(table.userId),
    uniqueIndex("idx_orders_crossmint_order_id").on(table.crossmintOrderId),
    uniqueIndex("idx_orders_polkadot_tx_hash").on(table.polkadotTxHash),
  ]
)

export type Order = typeof orders.$inferSelect
export type NewOrder = typeof orders.$inferInsert
