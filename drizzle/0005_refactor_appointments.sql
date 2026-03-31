CREATE TABLE "telehealth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"provider" varchar(50),
	"room_name" varchar(255),
	"meeting_url" text,
	"started_at" timestamp,
	"duration_seconds" integer DEFAULT 0,
	CONSTRAINT "telehealth_sessions_appointment_id_unique" UNIQUE("appointment_id")
);
--> statement-breakpoint
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_encounter_id_encounters_id_fk";
--> statement-breakpoint
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_pregnancy_id_pregnancies_id_fk";
--> statement-breakpoint
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_child_immunization_id_child_immunizations_id_fk";
--> statement-breakpoint
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_family_planning_id_family_plannings_id_fk";
--> statement-breakpoint
UPDATE "appointments" SET "date" = now() WHERE "date" IS NULL;--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "telehealth_sessions" ADD CONSTRAINT "telehealth_sessions_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" DROP COLUMN "encounter_id";--> statement-breakpoint
ALTER TABLE "appointments" DROP COLUMN "pregnancy_id";--> statement-breakpoint
ALTER TABLE "appointments" DROP COLUMN "child_immunization_id";--> statement-breakpoint
ALTER TABLE "appointments" DROP COLUMN "family_planning_id";--> statement-breakpoint
ALTER TABLE "appointments" DROP COLUMN "call_duration";--> statement-breakpoint
ALTER TABLE "appointments" DROP COLUMN "consultation_started";--> statement-breakpoint
ALTER TABLE "appointments" DROP COLUMN "meeting_provider";--> statement-breakpoint
ALTER TABLE "appointments" DROP COLUMN "meeting_room";--> statement-breakpoint
ALTER TABLE "appointments" DROP COLUMN "meeting_url";--> statement-breakpoint
ALTER TABLE "appointments" DROP COLUMN "context_module";--> statement-breakpoint
ALTER TABLE "appointments" DROP COLUMN "context_id";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."appointment_context_enum";
