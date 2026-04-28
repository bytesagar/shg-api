ALTER TABLE "antenatal_cares" ADD COLUMN "visit_id" uuid;--> statement-breakpoint
ALTER TABLE "antenatal_cares" ADD COLUMN "encounter_id" uuid;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "visit_id" uuid;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "encounter_id" uuid;--> statement-breakpoint
ALTER TABLE "postnatal_cares" ADD COLUMN "visit_id" uuid;--> statement-breakpoint
ALTER TABLE "postnatal_cares" ADD COLUMN "encounter_id" uuid;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD COLUMN "visit_id" uuid;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD COLUMN "encounter_id" uuid;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "antenatal_cares" ADD CONSTRAINT "antenatal_cares_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "antenatal_cares" ADD CONSTRAINT "antenatal_cares_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postnatal_cares" ADD CONSTRAINT "postnatal_cares_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postnatal_cares" ADD CONSTRAINT "postnatal_cares_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD CONSTRAINT "pregnancies_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD CONSTRAINT "pregnancies_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD CONSTRAINT "pregnancies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD CONSTRAINT "pregnancies_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "antenatal_care_visit_id_idx" ON "antenatal_cares" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "antenatal_care_encounter_id_idx" ON "antenatal_cares" USING btree ("encounter_id");--> statement-breakpoint
CREATE INDEX "delivery_visit_id_idx" ON "deliveries" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "delivery_encounter_id_idx" ON "deliveries" USING btree ("encounter_id");--> statement-breakpoint
CREATE INDEX "postnatal_care_visit_id_idx" ON "postnatal_cares" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "postnatal_care_encounter_id_idx" ON "postnatal_cares" USING btree ("encounter_id");--> statement-breakpoint
CREATE INDEX "pregnancy_visit_id_idx" ON "pregnancies" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "pregnancy_encounter_id_idx" ON "pregnancies" USING btree ("encounter_id");