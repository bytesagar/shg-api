ALTER TABLE "appointments" ADD COLUMN "meeting_provider" varchar(50);--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "meeting_room" varchar(255);--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "meeting_url" text;