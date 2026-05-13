CREATE TYPE "public"."imnci_action_kind_enum" AS ENUM('drug', 'referral', 'counselling', 'procedure');--> statement-breakpoint
CREATE TYPE "public"."imnci_booklet_status_enum" AS ENUM('draft', 'active', 'retired');--> statement-breakpoint
CREATE TYPE "public"."imnci_classification_source_enum" AS ENUM('engine', 'override');--> statement-breakpoint
CREATE TYPE "public"."imnci_follow_up_status_enum" AS ENUM('scheduled', 'completed', 'missed');--> statement-breakpoint
CREATE TYPE "public"."imnci_pathway_enum" AS ENUM('young_infant', 'sick_child');--> statement-breakpoint
CREATE TYPE "public"."imnci_severity_enum" AS ENUM('pink', 'yellow', 'green');--> statement-breakpoint
CREATE TYPE "public"."imnci_treatment_item_status_enum" AS ENUM('recommended', 'confirmed', 'overridden', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."imnci_visit_status_enum" AS ENUM('in_progress', 'classified', 'completed', 'referred');--> statement-breakpoint
CREATE TABLE "imnci_assessment_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visit_id" uuid NOT NULL,
	"question_key" varchar(128) NOT NULL,
	"value_bool" boolean,
	"value_int" integer,
	"value_text" text,
	"answered_at" timestamp DEFAULT now() NOT NULL,
	"answered_by_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE "imnci_chart_booklets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid,
	"municipality_id" uuid,
	"version_code" varchar(100) NOT NULL,
	"country" varchar(8) DEFAULT 'NP' NOT NULL,
	"effective_from" date NOT NULL,
	"status" "imnci_booklet_status_enum" DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "imnci_classification_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booklet_id" uuid NOT NULL,
	"pathway" "imnci_pathway_enum" NOT NULL,
	"section" varchar(64) NOT NULL,
	"classification_code" varchar(64) NOT NULL,
	"severity" "imnci_severity_enum" NOT NULL,
	"priority" integer NOT NULL,
	"predicate" jsonb NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "imnci_counselling_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booklet_id" uuid NOT NULL,
	"key" varchar(128) NOT NULL,
	"classification_code" varchar(64),
	"language" varchar(8) NOT NULL,
	"body" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imnci_fchv_commodities_dispensed" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"screening_id" uuid NOT NULL,
	"commodity" varchar(64) NOT NULL,
	"quantity" real NOT NULL,
	"unit" varchar(32) NOT NULL,
	"batch_no" varchar(64),
	"dispensed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imnci_fchv_screenings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"patient_id" uuid,
	"fchv_user_id" uuid NOT NULL,
	"visited_at" timestamp DEFAULT now() NOT NULL,
	"location" jsonb,
	"danger_signs_found" jsonb NOT NULL,
	"referral_recommended" boolean DEFAULT false NOT NULL,
	"referral_urgency" varchar(32),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "imnci_follow_ups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"visit_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"due_on" date NOT NULL,
	"reason" varchar(255) NOT NULL,
	"status" "imnci_follow_up_status_enum" DEFAULT 'scheduled' NOT NULL,
	"completed_visit_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "imnci_formulary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booklet_id" uuid NOT NULL,
	"drug_code" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"formulation" varchar(255),
	"weight_banded_doses" jsonb NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "imnci_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booklet_id" uuid NOT NULL,
	"key" varchar(128) NOT NULL,
	"pathway" "imnci_pathway_enum" NOT NULL,
	"section" varchar(64) NOT NULL,
	"prompt_key" varchar(255) NOT NULL,
	"prompts" jsonb NOT NULL,
	"input_type" varchar(16) NOT NULL,
	"options" jsonb,
	"validation" jsonb,
	"display_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imnci_referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"visit_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"from_facility_id" uuid NOT NULL,
	"to_facility_id" uuid,
	"reason" text NOT NULL,
	"classifications" jsonb NOT NULL,
	"pre_referral_treatment_given" jsonb,
	"referred_at" timestamp DEFAULT now() NOT NULL,
	"referred_by_user_id" uuid,
	"outcome" varchar(64)
);
--> statement-breakpoint
CREATE TABLE "imnci_treatment_plan_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visit_id" uuid NOT NULL,
	"classification_code" varchar(64) NOT NULL,
	"kind" "imnci_action_kind_enum" NOT NULL,
	"drug_code" varchar(64),
	"dose_amount" real,
	"dose_unit" varchar(32),
	"frequency" varchar(64),
	"duration_days" integer,
	"counselling_key" varchar(128),
	"status" "imnci_treatment_item_status_enum" DEFAULT 'recommended' NOT NULL,
	"confirmed_by_user_id" uuid,
	"confirmed_at" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "imnci_treatment_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booklet_id" uuid NOT NULL,
	"classification_code" varchar(64) NOT NULL,
	"action_kind" "imnci_action_kind_enum" NOT NULL,
	"drug_code" varchar(64),
	"dose_table" jsonb,
	"duration_days" integer,
	"follow_up_days" integer,
	"counselling_key" varchar(128),
	"sequence" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imnci_visit_classifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visit_id" uuid NOT NULL,
	"classification_code" varchar(64) NOT NULL,
	"severity" "imnci_severity_enum" NOT NULL,
	"section" varchar(64) NOT NULL,
	"rule_id_snapshot" uuid,
	"source" "imnci_classification_source_enum" DEFAULT 'engine' NOT NULL,
	"referral_required" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imnci_visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"encounter_id" uuid NOT NULL,
	"booklet_id" uuid NOT NULL,
	"pathway" "imnci_pathway_enum" NOT NULL,
	"age_months_at_visit" integer NOT NULL,
	"weight_kg" real,
	"temp_c" real,
	"muac_mm" integer,
	"status" "imnci_visit_status_enum" DEFAULT 'in_progress' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"classified_at" timestamp,
	"completed_at" timestamp,
	"started_by_user_id" uuid,
	"completed_by_user_id" uuid
);
--> statement-breakpoint
ALTER TABLE "imnci_assessment_answers" ADD CONSTRAINT "imnci_assessment_answers_visit_id_imnci_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."imnci_visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imnci_assessment_answers" ADD CONSTRAINT "imnci_assessment_answers_answered_by_user_id_users_id_fk" FOREIGN KEY ("answered_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imnci_chart_booklets" ADD CONSTRAINT "imnci_chart_booklets_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imnci_chart_booklets" ADD CONSTRAINT "imnci_chart_booklets_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imnci_classification_rules" ADD CONSTRAINT "imnci_classification_rules_booklet_id_imnci_chart_booklets_id_fk" FOREIGN KEY ("booklet_id") REFERENCES "public"."imnci_chart_booklets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imnci_counselling_messages" ADD CONSTRAINT "imnci_counselling_messages_booklet_id_imnci_chart_booklets_id_fk" FOREIGN KEY ("booklet_id") REFERENCES "public"."imnci_chart_booklets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imnci_fchv_commodities_dispensed" ADD CONSTRAINT "imnci_fchv_commodities_dispensed_screening_id_imnci_fchv_screenings_id_fk" FOREIGN KEY ("screening_id") REFERENCES "public"."imnci_fchv_screenings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imnci_fchv_screenings" ADD CONSTRAINT "imnci_fchv_screenings_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imnci_fchv_screenings" ADD CONSTRAINT "imnci_fchv_screenings_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imnci_fchv_screenings" ADD CONSTRAINT "imnci_fchv_screenings_fchv_user_id_users_id_fk" FOREIGN KEY ("fchv_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imnci_follow_ups" ADD CONSTRAINT "imnci_follow_ups_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imnci_follow_ups" ADD CONSTRAINT "imnci_follow_ups_visit_id_imnci_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."imnci_visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imnci_follow_ups" ADD CONSTRAINT "imnci_follow_ups_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imnci_follow_ups" ADD CONSTRAINT "imnci_follow_ups_completed_visit_id_imnci_visits_id_fk" FOREIGN KEY ("completed_visit_id") REFERENCES "public"."imnci_visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imnci_formulary" ADD CONSTRAINT "imnci_formulary_booklet_id_imnci_chart_booklets_id_fk" FOREIGN KEY ("booklet_id") REFERENCES "public"."imnci_chart_booklets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imnci_questions" ADD CONSTRAINT "imnci_questions_booklet_id_imnci_chart_booklets_id_fk" FOREIGN KEY ("booklet_id") REFERENCES "public"."imnci_chart_booklets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imnci_referrals" ADD CONSTRAINT "imnci_referrals_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imnci_referrals" ADD CONSTRAINT "imnci_referrals_visit_id_imnci_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."imnci_visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imnci_referrals" ADD CONSTRAINT "imnci_referrals_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imnci_referrals" ADD CONSTRAINT "imnci_referrals_from_facility_id_health_facilities_id_fk" FOREIGN KEY ("from_facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imnci_referrals" ADD CONSTRAINT "imnci_referrals_to_facility_id_health_facilities_id_fk" FOREIGN KEY ("to_facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imnci_referrals" ADD CONSTRAINT "imnci_referrals_referred_by_user_id_users_id_fk" FOREIGN KEY ("referred_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imnci_treatment_plan_items" ADD CONSTRAINT "imnci_treatment_plan_items_visit_id_imnci_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."imnci_visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imnci_treatment_plan_items" ADD CONSTRAINT "imnci_treatment_plan_items_confirmed_by_user_id_users_id_fk" FOREIGN KEY ("confirmed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imnci_treatment_rules" ADD CONSTRAINT "imnci_treatment_rules_booklet_id_imnci_chart_booklets_id_fk" FOREIGN KEY ("booklet_id") REFERENCES "public"."imnci_chart_booklets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imnci_visit_classifications" ADD CONSTRAINT "imnci_visit_classifications_visit_id_imnci_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."imnci_visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imnci_visits" ADD CONSTRAINT "imnci_visits_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imnci_visits" ADD CONSTRAINT "imnci_visits_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imnci_visits" ADD CONSTRAINT "imnci_visits_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imnci_visits" ADD CONSTRAINT "imnci_visits_booklet_id_imnci_chart_booklets_id_fk" FOREIGN KEY ("booklet_id") REFERENCES "public"."imnci_chart_booklets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imnci_visits" ADD CONSTRAINT "imnci_visits_started_by_user_id_users_id_fk" FOREIGN KEY ("started_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imnci_visits" ADD CONSTRAINT "imnci_visits_completed_by_user_id_users_id_fk" FOREIGN KEY ("completed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "imnci_answers_visit_key_idx" ON "imnci_assessment_answers" USING btree ("visit_id","question_key");--> statement-breakpoint
CREATE INDEX "imnci_answers_visit_answered_at_idx" ON "imnci_assessment_answers" USING btree ("visit_id","answered_at");--> statement-breakpoint
CREATE INDEX "imnci_chart_booklets_facility_idx" ON "imnci_chart_booklets" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "imnci_chart_booklets_municipality_idx" ON "imnci_chart_booklets" USING btree ("municipality_id");--> statement-breakpoint
CREATE INDEX "imnci_chart_booklets_status_idx" ON "imnci_chart_booklets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "imnci_classification_rules_booklet_section_idx" ON "imnci_classification_rules" USING btree ("booklet_id","section","priority");--> statement-breakpoint
CREATE UNIQUE INDEX "imnci_classification_rules_booklet_code_idx" ON "imnci_classification_rules" USING btree ("booklet_id","classification_code");--> statement-breakpoint
CREATE UNIQUE INDEX "imnci_counselling_booklet_key_lang_idx" ON "imnci_counselling_messages" USING btree ("booklet_id","key","language");--> statement-breakpoint
CREATE INDEX "imnci_fchv_commodities_screening_idx" ON "imnci_fchv_commodities_dispensed" USING btree ("screening_id");--> statement-breakpoint
CREATE INDEX "imnci_fchv_screenings_facility_idx" ON "imnci_fchv_screenings" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "imnci_fchv_screenings_fchv_visited_idx" ON "imnci_fchv_screenings" USING btree ("fchv_user_id","visited_at");--> statement-breakpoint
CREATE INDEX "imnci_follow_ups_facility_due_idx" ON "imnci_follow_ups" USING btree ("facility_id","due_on");--> statement-breakpoint
CREATE INDEX "imnci_follow_ups_status_due_idx" ON "imnci_follow_ups" USING btree ("status","due_on");--> statement-breakpoint
CREATE UNIQUE INDEX "imnci_formulary_booklet_drug_idx" ON "imnci_formulary" USING btree ("booklet_id","drug_code");--> statement-breakpoint
CREATE UNIQUE INDEX "imnci_questions_booklet_key_idx" ON "imnci_questions" USING btree ("booklet_id","key");--> statement-breakpoint
CREATE INDEX "imnci_questions_section_idx" ON "imnci_questions" USING btree ("booklet_id","section");--> statement-breakpoint
CREATE INDEX "imnci_referrals_facility_idx" ON "imnci_referrals" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "imnci_referrals_to_facility_idx" ON "imnci_referrals" USING btree ("to_facility_id");--> statement-breakpoint
CREATE INDEX "imnci_plan_items_visit_idx" ON "imnci_treatment_plan_items" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "imnci_plan_items_visit_status_idx" ON "imnci_treatment_plan_items" USING btree ("visit_id","status");--> statement-breakpoint
CREATE INDEX "imnci_treatment_rules_booklet_code_idx" ON "imnci_treatment_rules" USING btree ("booklet_id","classification_code");--> statement-breakpoint
CREATE INDEX "imnci_visit_classifications_visit_idx" ON "imnci_visit_classifications" USING btree ("visit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "imnci_visits_encounter_idx" ON "imnci_visits" USING btree ("encounter_id");--> statement-breakpoint
CREATE INDEX "imnci_visits_facility_patient_idx" ON "imnci_visits" USING btree ("facility_id","patient_id");--> statement-breakpoint
CREATE INDEX "imnci_visits_facility_status_idx" ON "imnci_visits" USING btree ("facility_id","status");