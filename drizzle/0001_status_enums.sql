CREATE TYPE "public"."appointment_status_enum" AS ENUM('scheduled', 'confirmed', 'cancelled', 'completed', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."call_request_status_enum" AS ENUM('pending', 'accepted', 'declined', 'completed');--> statement-breakpoint
CREATE TYPE "public"."encounter_status_enum" AS ENUM('planned', 'arrived', 'in_progress', 'finished', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."patient_status_enum" AS ENUM('active', 'inactive', 'deceased', 'discharged', 'referred');--> statement-breakpoint
UPDATE "appointments" SET "status" = lower("status");--> statement-breakpoint
UPDATE "appointments" SET "status" = 'scheduled' WHERE "status" NOT IN ('scheduled', 'confirmed', 'cancelled', 'completed', 'no_show') OR "status" IS NULL;--> statement-breakpoint
UPDATE "call_requests" SET "status" = lower("status") WHERE "status" IS NOT NULL;--> statement-breakpoint
UPDATE "call_requests" SET "status" = 'pending' WHERE "status" IS NOT NULL AND "status" NOT IN ('pending', 'accepted', 'declined', 'completed');--> statement-breakpoint
UPDATE "encounters" SET "status" = lower("status") WHERE "status" IS NOT NULL;--> statement-breakpoint
UPDATE "encounters" SET "status" = 'finished' WHERE "status" = 'active';--> statement-breakpoint
UPDATE "encounters" SET "status" = 'planned' WHERE "status" IS NOT NULL AND "status" NOT IN ('planned', 'arrived', 'in_progress', 'finished', 'cancelled');--> statement-breakpoint
UPDATE "patients" SET "status" = lower("status") WHERE "status" IS NOT NULL;--> statement-breakpoint
UPDATE "patients" SET "status" = 'active' WHERE "status" NOT IN ('active', 'inactive', 'deceased', 'discharged', 'referred') OR "status" IS NULL;--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "status" SET DEFAULT 'scheduled'::"public"."appointment_status_enum";--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "status" SET DATA TYPE "public"."appointment_status_enum" USING "status"::"public"."appointment_status_enum";--> statement-breakpoint
ALTER TABLE "call_requests" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."call_request_status_enum";--> statement-breakpoint
ALTER TABLE "call_requests" ALTER COLUMN "status" SET DATA TYPE "public"."call_request_status_enum" USING "status"::"public"."call_request_status_enum";--> statement-breakpoint
ALTER TABLE "encounters" ALTER COLUMN "status" SET DEFAULT 'planned'::"public"."encounter_status_enum";--> statement-breakpoint
ALTER TABLE "encounters" ALTER COLUMN "status" SET DATA TYPE "public"."encounter_status_enum" USING "status"::"public"."encounter_status_enum";--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "status" SET DEFAULT 'active'::"public"."patient_status_enum";--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "status" SET DATA TYPE "public"."patient_status_enum" USING "status"::"public"."patient_status_enum";--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "status" SET NOT NULL;
