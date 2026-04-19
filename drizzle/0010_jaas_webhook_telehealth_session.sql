CREATE TABLE "jaas_webhook_idempotency" (
	"idempotency_key" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "telehealth_sessions" ADD COLUMN "ended_at" timestamp;--> statement-breakpoint
ALTER TABLE "telehealth_sessions" ADD COLUMN "jaas_session_id" varchar(255);