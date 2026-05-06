ALTER TABLE "immunization_histories" ADD COLUMN "visit_id" uuid;--> statement-breakpoint
ALTER TABLE "immunization_histories" ADD COLUMN "encounter_id" uuid;--> statement-breakpoint
ALTER TABLE "immunization_histories" ADD CONSTRAINT "immunization_histories_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "immunization_histories" ADD CONSTRAINT "immunization_histories_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "immunization_history_visit_id_idx" ON "immunization_histories" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "immunization_history_encounter_id_idx" ON "immunization_histories" USING btree ("encounter_id");