ALTER TABLE "sms_logs" ALTER COLUMN "patient_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sms_logs" ALTER COLUMN "schedule_date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sms_logs" ADD COLUMN "facility_id" uuid;--> statement-breakpoint
ALTER TABLE "sms_logs" ADD COLUMN "template_key" varchar(64);--> statement-breakpoint
ALTER TABLE "sms_logs" ADD COLUMN "provider" varchar(32);--> statement-breakpoint
ALTER TABLE "sms_logs" ADD COLUMN "provider_message_id" varchar(255);--> statement-breakpoint
ALTER TABLE "sms_logs" ADD COLUMN "error" text;--> statement-breakpoint
ALTER TABLE "sms_logs" ADD COLUMN "sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "sms_logs" ADD CONSTRAINT "sms_logs_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sms_log_facility_id_idx" ON "sms_logs" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "sms_log_status_idx" ON "sms_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sms_log_schedule_date_idx" ON "sms_logs" USING btree ("schedule_date");