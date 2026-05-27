CREATE TABLE "imnci_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"facility_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" uuid,
	"encounter_id" uuid,
	"age_band" varchar(32) NOT NULL,
	"values" jsonb NOT NULL,
	"client_created_at" timestamp with time zone NOT NULL,
	"client_updated_at" timestamp with time zone NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "imnci_records" ADD CONSTRAINT "imnci_records_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imnci_records" ADD CONSTRAINT "imnci_records_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imnci_records" ADD CONSTRAINT "imnci_records_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imnci_records" ADD CONSTRAINT "imnci_records_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imnci_records" ADD CONSTRAINT "imnci_records_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "imnci_records_facility_patient_idx" ON "imnci_records" USING btree ("facility_id","patient_id");--> statement-breakpoint
CREATE INDEX "imnci_records_facility_patient_band_idx" ON "imnci_records" USING btree ("facility_id","patient_id","age_band");--> statement-breakpoint
CREATE INDEX "imnci_records_facility_updated_idx" ON "imnci_records" USING btree ("facility_id","updated_at");