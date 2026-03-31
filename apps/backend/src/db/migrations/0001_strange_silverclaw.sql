CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crossmint_user_id" varchar(255) NOT NULL,
	"email" varchar(320) NOT NULL,
	"wallet_address" varchar(42),
	"crossmint_wallet_id" varchar(255),
	"wallet_status" varchar(20) DEFAULT 'none' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_crossmint_user_id" ON "users" USING btree ("crossmint_user_id");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");