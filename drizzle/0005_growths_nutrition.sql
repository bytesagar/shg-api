ALTER TABLE "growths" ADD COLUMN "facility_id" uuid;--> statement-breakpoint
UPDATE "growths" g SET "facility_id" = p."facility_id" FROM "patients" p WHERE g."patient_id" = p."id" AND g."facility_id" IS NULL;--> statement-breakpoint
ALTER TABLE "growths" ALTER COLUMN "facility_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "growths" ADD CONSTRAINT "growths_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "growth_facility_patient_idx" ON "growths" USING btree ("facility_id","patient_id");--> statement-breakpoint
CREATE INDEX "growth_facility_patient_date_idx" ON "growths" USING btree ("facility_id","patient_id","date");
