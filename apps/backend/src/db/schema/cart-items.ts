import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { users } from "./users"

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: varchar("product_id", { length: 255 }).notNull(),
    productName: varchar("product_name", { length: 500 }).notNull(),
    price: integer("price").notNull(),
    image: varchar("image", { length: 2048 }).notNull(),
    size: varchar("size", { length: 50 }).notNull(),
    color: varchar("color", { length: 50 }).notNull(),
    productUrl: varchar("product_url", { length: 2048 }).notNull(),
    retailer: varchar("retailer", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_cart_items_user_id").on(table.userId),
    uniqueIndex("idx_cart_items_user_variant").on(
      table.userId,
      table.productId,
      table.size,
      table.color
    ),
  ]
)

export type CartItem = typeof cartItems.$inferSelect
export type NewCartItem = typeof cartItems.$inferInsert
