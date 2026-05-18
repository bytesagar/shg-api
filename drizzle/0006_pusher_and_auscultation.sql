CREATE TABLE "auscultation_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"encounter_id" uuid,
	"visit_id" uuid,
	"appointment_id" uuid,
	"provider" varchar(50) DEFAULT 'jitsi_jaas' NOT NULL,
	"room_name" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"recording_attachment_id" uuid,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "auscultation_sessions" ADD CONSTRAINT "auscultation_sessions_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auscultation_sessions" ADD CONSTRAINT "auscultation_sessions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auscultation_sessions" ADD CONSTRAINT "auscultation_sessions_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auscultation_sessions" ADD CONSTRAINT "auscultation_sessions_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auscultation_sessions" ADD CONSTRAINT "auscultation_sessions_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auscultation_sessions" ADD CONSTRAINT "auscultation_sessions_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auscultation_sessions" ADD CONSTRAINT "auscultation_sessions_recording_attachment_id_attachments_id_fk" FOREIGN KEY ("recording_attachment_id") REFERENCES "public"."attachments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auscultation_sessions" ADD CONSTRAINT "auscultation_sessions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auscultation_sessions" ADD CONSTRAINT "auscultation_sessions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auscultation_session_facility_idx" ON "auscultation_sessions" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "auscultation_session_facility_patient_idx" ON "auscultation_sessions" USING btree ("facility_id","patient_id");--> statement-breakpoint
CREATE INDEX "auscultation_session_facility_doctor_idx" ON "auscultation_sessions" USING btree ("facility_id","doctor_id");--> statement-breakpoint
CREATE INDEX "auscultation_session_appointment_idx" ON "auscultation_sessions" USING btree ("appointment_id");