CREATE TYPE "public"."lab_order_priority_enum" AS ENUM('routine', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."lab_order_status_enum" AS ENUM('pending', 'collected', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."lab_order_type_enum" AS ENUM('pathology', 'radiology');--> statement-breakpoint
CREATE TABLE "lab_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "lab_order_type_enum" NOT NULL,
	"lab_test_id" uuid,
	"name" varchar(255) NOT NULL,
	"panel" varchar(64),
	"modality" varchar(64),
	"patient_id" uuid NOT NULL,
	"visit_id" uuid,
	"encounter_id" uuid,
	"facility_id" uuid NOT NULL,
	"ordered_by_id" uuid,
	"ordered_at" timestamp DEFAULT now() NOT NULL,
	"reason" text,
	"priority" "lab_order_priority_enum" DEFAULT 'routine' NOT NULL,
	"status" "lab_order_status_enum" DEFAULT 'pending' NOT NULL,
	"specimen" varchar(255),
	"collected_at" timestamp,
	"collected_by_name" varchar(255),
	"result_mode" varchar(16),
	"result" jsonb,
	"attachment_id" uuid,
	"completed_by_name" varchar(255),
	"completed_at" timestamp,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_lab_test_id_lab_tests_id_fk" FOREIGN KEY ("lab_test_id") REFERENCES "public"."lab_tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_ordered_by_id_users_id_fk" FOREIGN KEY ("ordered_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_attachment_id_attachments_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."attachments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lab_order_facility_id_idx" ON "lab_orders" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "lab_order_patient_id_idx" ON "lab_orders" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "lab_order_visit_id_idx" ON "lab_orders" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "lab_order_facility_status_idx" ON "lab_orders" USING btree ("facility_id","status");--> statement-breakpoint
CREATE INDEX "lab_order_facility_type_status_idx" ON "lab_orders" USING btree ("facility_id","type","status");--> statement-breakpoint
CREATE INDEX "lab_order_facility_ordered_idx" ON "lab_orders" USING btree ("facility_id","ordered_at");