CREATE TYPE "public"."appointment_context_enum" AS ENUM('general', 'pregnancy', 'child_immunization', 'family_planning');--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "context_module" "appointment_context_enum";--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "context_id" uuid;