CREATE TABLE "cart_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"product_id" varchar(255) NOT NULL,
	"product_name" varchar(500) NOT NULL,
	"price" integer NOT NULL,
	"image" varchar(2048) NOT NULL,
	"size" varchar(50) NOT NULL,
	"color" varchar(50) NOT NULL,
	"product_url" varchar(2048) NOT NULL,
	"retailer" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_cart_items_user_id" ON "cart_items" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_cart_items_user_variant" ON "cart_items" USING btree ("user_id","product_id","size","color");