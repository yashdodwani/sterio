ALTER TABLE "users" ADD COLUMN "onboarding_step" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "display_name" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "first_name" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_name" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "street" varchar(200);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "apt" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "country" varchar(2);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "city" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "state" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "zip" varchar(20);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tops_size" varchar(10);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bottoms_size" varchar(10);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "footwear_size" varchar(10);