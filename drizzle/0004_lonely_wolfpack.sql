CREATE TYPE "public"."pregnancy_status_enum" AS ENUM('active', 'ended');--> statement-breakpoint
ALTER TABLE "pregnancies" ADD COLUMN "status" "pregnancy_status_enum" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD COLUMN "ended_at" timestamp;