ALTER TABLE "chat_messages" ADD COLUMN "msg_id" varchar(100);--> statement-breakpoint
ALTER TABLE "chat_messages" RENAME COLUMN "content" TO "parts";--> statement-breakpoint
ALTER TABLE "chat_messages" ALTER COLUMN "role" TYPE varchar(20);
