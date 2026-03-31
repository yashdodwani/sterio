import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core"

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    crossmintUserId: varchar("crossmint_user_id", { length: 255 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    walletAddress: varchar("wallet_address", { length: 42 }),
    crossmintWalletId: varchar("crossmint_wallet_id", { length: 255 }),
    walletStatus: varchar("wallet_status", { length: 20 })
      .notNull()
      .default("none"),
    onboardingStep: integer("onboarding_step").notNull().default(0),
    displayName: varchar("display_name", { length: 100 }),
    firstName: varchar("first_name", { length: 50 }),
    lastName: varchar("last_name", { length: 50 }),
    street: varchar("street", { length: 200 }),
    apt: varchar("apt", { length: 50 }),
    country: varchar("country", { length: 2 }),
    city: varchar("city", { length: 100 }),
    state: varchar("state", { length: 100 }),
    zip: varchar("zip", { length: 20 }),
    topsSize: varchar("tops_size", { length: 10 }),
    bottomsSize: varchar("bottoms_size", { length: 10 }),
    footwearSize: varchar("footwear_size", { length: 10 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_users_crossmint_user_id").on(table.crossmintUserId),
    index("idx_users_email").on(table.email),
  ]
)

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type WalletStatus = "none" | "pending" | "active" | "failed"
