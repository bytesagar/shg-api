ALTER TABLE "antenatal_cares" ALTER COLUMN "anc_visit_date" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "antenatal_cares" ALTER COLUMN "next_visit_schedule" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "deliveries" ALTER COLUMN "delivery_date" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "family_planning_news" ALTER COLUMN "last_menstrual_period" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "family_planning_news" ALTER COLUMN "usage_date" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "family_planning_news" ALTER COLUMN "follow_up_date" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "family_planning_removals" ALTER COLUMN "last_menstrual_period" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "family_planning_removals" ALTER COLUMN "removal_date" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "family_planning_removals" ALTER COLUMN "removal_date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "family_plannings" ALTER COLUMN "service_date" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "postnatal_cares" ALTER COLUMN "visit_date" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "pregnancies" ALTER COLUMN "first_visit" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "pregnancies" ALTER COLUMN "last_menstruation_period" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "pregnancies" ALTER COLUMN "expected_delivery_date" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "family_plannings" ADD COLUMN "visit_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "family_plannings" ADD COLUMN "encounter_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "family_plannings" ADD CONSTRAINT "family_plannings_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_plannings" ADD CONSTRAINT "family_plannings_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "family_planning_visit_id_idx" ON "family_plannings" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "family_planning_encounter_id_idx" ON "family_plannings" USING btree ("encounter_id");