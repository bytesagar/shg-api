ALTER TABLE "auscultation_sessions" DROP CONSTRAINT "auscultation_sessions_recording_attachment_id_attachments_id_fk";
--> statement-breakpoint
ALTER TABLE "tests" DROP CONSTRAINT "tests_attachment_id_attachments_id_fk";
--> statement-breakpoint
ALTER TABLE "auscultation_sessions" ADD CONSTRAINT "auscultation_sessions_recording_attachment_id_attachments_id_fk" FOREIGN KEY ("recording_attachment_id") REFERENCES "public"."attachments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tests" ADD CONSTRAINT "tests_attachment_id_attachments_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."attachments"("id") ON DELETE set null ON UPDATE no action;