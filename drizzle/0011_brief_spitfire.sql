CREATE TABLE "encounters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"encounter_at" timestamp DEFAULT now() NOT NULL,
	"reason" text NOT NULL,
	"service" varchar(255),
	"status" "visit_status_enum" DEFAULT 'planned',
	"encounter_type" varchar(100) NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" uuid NOT NULL,
	"facility_id" uuid,
	"follow_up_id" uuid,
	"doctor_id" uuid,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "complaints" ADD COLUMN "encounter_id" uuid;--> statement-breakpoint
ALTER TABLE "confirm_diagnoses" ADD COLUMN "encounter_id" uuid;--> statement-breakpoint
ALTER TABLE "histories" ADD COLUMN "encounter_id" uuid;--> statement-breakpoint
ALTER TABLE "medications" ADD COLUMN "encounter_id" uuid;--> statement-breakpoint
ALTER TABLE "physical_examinations" ADD COLUMN "encounter_id" uuid;--> statement-breakpoint
ALTER TABLE "provisional_diagnoses" ADD COLUMN "encounter_id" uuid;--> statement-breakpoint
ALTER TABLE "tests" ADD COLUMN "encounter_id" uuid;--> statement-breakpoint
ALTER TABLE "treatments" ADD COLUMN "encounter_id" uuid;--> statement-breakpoint
ALTER TABLE "vitals" ADD COLUMN "encounter_id" uuid;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "encounter_patient_id_idx" ON "encounters" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "encounter_visit_id_idx" ON "encounters" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "encounter_doctor_id_idx" ON "encounters" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "encounter_facility_id_idx" ON "encounters" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "encounter_at_idx" ON "encounters" USING btree ("encounter_at");--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confirm_diagnoses" ADD CONSTRAINT "confirm_diagnoses_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "histories" ADD CONSTRAINT "histories_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_examinations" ADD CONSTRAINT "physical_examinations_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provisional_diagnoses" ADD CONSTRAINT "provisional_diagnoses_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tests" ADD CONSTRAINT "tests_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vitals" ADD CONSTRAINT "vitals_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "complaint_encounter_id_idx" ON "complaints" USING btree ("encounter_id");--> statement-breakpoint
CREATE INDEX "confirm_diagnosis_encounter_id_idx" ON "confirm_diagnoses" USING btree ("encounter_id");--> statement-breakpoint
CREATE INDEX "history_encounter_id_idx" ON "histories" USING btree ("encounter_id");--> statement-breakpoint
CREATE INDEX "medication_encounter_id_idx" ON "medications" USING btree ("encounter_id");--> statement-breakpoint
CREATE INDEX "physical_examination_encounter_id_idx" ON "physical_examinations" USING btree ("encounter_id");--> statement-breakpoint
CREATE INDEX "provisional_diagnosis_encounter_id_idx" ON "provisional_diagnoses" USING btree ("encounter_id");--> statement-breakpoint
CREATE INDEX "test_encounter_id_idx" ON "tests" USING btree ("encounter_id");--> statement-breakpoint
CREATE INDEX "treatment_encounter_id_idx" ON "treatments" USING btree ("encounter_id");--> statement-breakpoint
CREATE INDEX "vital_encounter_id_idx" ON "vitals" USING btree ("encounter_id");