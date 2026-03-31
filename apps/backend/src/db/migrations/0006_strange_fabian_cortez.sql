ALTER TABLE "orders" ALTER COLUMN "crossmint_order_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "type" varchar(20) DEFAULT 'checkout' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "amount_pas" numeric;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "amount_usdc" numeric;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "polkadot_tx_hash" varchar(255);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_orders_polkadot_tx_hash" ON "orders" USING btree ("polkadot_tx_hash");