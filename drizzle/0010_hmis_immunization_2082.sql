CREATE TYPE "public"."aefi_outcome_enum" AS ENUM('recovered', 'recovering', 'referred', 'died', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."aefi_severity_enum" AS ENUM('mild', 'severe');--> statement-breakpoint
CREATE TYPE "public"."immunization_mode_enum" AS ENUM('routine', 'campaign', 'school', 'catch_up', 'outbreak_response');--> statement-breakpoint
CREATE TYPE "public"."vaccine_category_enum" AS ENUM('vaccine', 'nutrition');--> statement-breakpoint
CREATE TYPE "public"."vaccine_route_enum" AS ENUM('im', 'sc', 'id', 'po', 'nasal', 'other');--> statement-breakpoint
CREATE TYPE "public"."vaccine_site_enum" AS ENUM('left_arm', 'right_arm', 'left_thigh', 'right_thigh', 'oral', 'other');--> statement-breakpoint
CREATE TABLE "aefi_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"immunization_history_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"child_immunization_id" uuid NOT NULL,
	"parent_name" varchar(255),
	"parent_contact" varchar(50),
	"aefi_registered_at" date NOT NULL,
	"vaccine_code" varchar(40) NOT NULL,
	"vaccine_batch" varchar(60),
	"diluent_batch" varchar(60),
	"vaccinated_at" timestamp,
	"vaccination_place" text,
	"symptom_onset_at" timestamp,
	"symptoms" text,
	"severity" "aefi_severity_enum" NOT NULL,
	"outcome" "aefi_outcome_enum",
	"management" text,
	"referred_to_facility_id" uuid,
	"notes" text,
	"facility_id" uuid NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "child_feeding_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_immunization_id" uuid NOT NULL,
	"breastfed_within_1h" boolean,
	"exclusive_bf_months" integer,
	"complementary_feeding_start_age_months" integer,
	"notes" text,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "hpv_school_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"school_name" varchar(255),
	"session_date" date NOT NULL,
	"grade" varchar(20),
	"notes" text,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "immunization_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"vaccine_code" varchar(40) NOT NULL,
	"round_number" integer,
	"campaign_kind" varchar(30),
	"start_date" date NOT NULL,
	"end_date" date,
	"target_age_min_months" integer,
	"target_age_max_months" integer,
	"target_population" integer,
	"notes" text,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "vaccine_doses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vaccine_code" varchar(40) NOT NULL,
	"dose_number" integer NOT NULL,
	"label" jsonb NOT NULL,
	"target_age_min_days" integer,
	"target_age_max_days" integer,
	"milestone" varchar(40),
	"display_order" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "vaccines" (
	"code" varchar(40) PRIMARY KEY NOT NULL,
	"label" jsonb NOT NULL,
	"total_doses" integer NOT NULL,
	"default_route" "vaccine_route_enum",
	"default_site" "vaccine_site_enum",
	"category" "vaccine_category_enum" DEFAULT 'vaccine' NOT NULL,
	"is_hpv" boolean DEFAULT false NOT NULL,
	"display_order" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "child_immunizations" ADD COLUMN "hmis_ethnic_code" "hmis_ethnic_code_enum";--> statement-breakpoint
ALTER TABLE "child_immunizations" ADD COLUMN "birth_order" integer;--> statement-breakpoint
ALTER TABLE "child_immunizations" ADD COLUMN "delayed_schedule_started_at_months" integer;--> statement-breakpoint
ALTER TABLE "child_immunizations" ADD COLUMN "out_of_catchment" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "child_immunizations" ADD COLUMN "service_registration_number" varchar(50);--> statement-breakpoint
ALTER TABLE "child_immunizations" ADD COLUMN "enrolled_fiscal_year" integer;--> statement-breakpoint
ALTER TABLE "immunization_histories" ADD COLUMN "vaccine_code" varchar(40);--> statement-breakpoint
ALTER TABLE "immunization_histories" ADD COLUMN "dose_number" integer;--> statement-breakpoint
ALTER TABLE "immunization_histories" ADD COLUMN "mode" "immunization_mode_enum" DEFAULT 'routine' NOT NULL;--> statement-breakpoint
ALTER TABLE "immunization_histories" ADD COLUMN "campaign_id" uuid;--> statement-breakpoint
ALTER TABLE "immunization_histories" ADD COLUMN "hpv_session_id" uuid;--> statement-breakpoint
ALTER TABLE "immunization_histories" ADD COLUMN "batch_number" varchar(60);--> statement-breakpoint
ALTER TABLE "immunization_histories" ADD COLUMN "diluent_batch_number" varchar(60);--> statement-breakpoint
ALTER TABLE "immunization_histories" ADD COLUMN "lot_number" varchar(60);--> statement-breakpoint
ALTER TABLE "immunization_histories" ADD COLUMN "expiry_date" date;--> statement-breakpoint
ALTER TABLE "immunization_histories" ADD COLUMN "site" "vaccine_site_enum";--> statement-breakpoint
ALTER TABLE "immunization_histories" ADD COLUMN "route" "vaccine_route_enum";--> statement-breakpoint
ALTER TABLE "immunization_histories" ADD COLUMN "administered_by" uuid;--> statement-breakpoint
ALTER TABLE "immunization_histories" ADD COLUMN "administered_at" timestamp;--> statement-breakpoint
ALTER TABLE "immunization_histories" ADD COLUMN "next_dose_due_date" date;--> statement-breakpoint
ALTER TABLE "immunization_histories" ADD COLUMN "source_facility_name" varchar(255);--> statement-breakpoint
ALTER TABLE "immunization_histories" ADD COLUMN "facility_id" uuid;--> statement-breakpoint
ALTER TABLE "aefi_events" ADD CONSTRAINT "aefi_events_immunization_history_id_immunization_histories_id_fk" FOREIGN KEY ("immunization_history_id") REFERENCES "public"."immunization_histories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aefi_events" ADD CONSTRAINT "aefi_events_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aefi_events" ADD CONSTRAINT "aefi_events_child_immunization_id_child_immunizations_id_fk" FOREIGN KEY ("child_immunization_id") REFERENCES "public"."child_immunizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aefi_events" ADD CONSTRAINT "aefi_events_referred_to_facility_id_health_facilities_id_fk" FOREIGN KEY ("referred_to_facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aefi_events" ADD CONSTRAINT "aefi_events_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aefi_events" ADD CONSTRAINT "aefi_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aefi_events" ADD CONSTRAINT "aefi_events_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "child_feeding_milestones" ADD CONSTRAINT "child_feeding_milestones_child_immunization_id_child_immunizations_id_fk" FOREIGN KEY ("child_immunization_id") REFERENCES "public"."child_immunizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "child_feeding_milestones" ADD CONSTRAINT "child_feeding_milestones_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "child_feeding_milestones" ADD CONSTRAINT "child_feeding_milestones_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hpv_school_sessions" ADD CONSTRAINT "hpv_school_sessions_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hpv_school_sessions" ADD CONSTRAINT "hpv_school_sessions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hpv_school_sessions" ADD CONSTRAINT "hpv_school_sessions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "immunization_campaigns" ADD CONSTRAINT "immunization_campaigns_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "immunization_campaigns" ADD CONSTRAINT "immunization_campaigns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "immunization_campaigns" ADD CONSTRAINT "immunization_campaigns_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaccine_doses" ADD CONSTRAINT "vaccine_doses_vaccine_code_vaccines_code_fk" FOREIGN KEY ("vaccine_code") REFERENCES "public"."vaccines"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "aefi_patient_idx" ON "aefi_events" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "aefi_facility_registered_at_idx" ON "aefi_events" USING btree ("facility_id","aefi_registered_at");--> statement-breakpoint
CREATE INDEX "aefi_immunization_history_idx" ON "aefi_events" USING btree ("immunization_history_id");--> statement-breakpoint
CREATE UNIQUE INDEX "child_feeding_milestones_unique" ON "child_feeding_milestones" USING btree ("child_immunization_id");--> statement-breakpoint
CREATE INDEX "hpv_school_session_facility_date_idx" ON "hpv_school_sessions" USING btree ("facility_id","session_date");--> statement-breakpoint
CREATE INDEX "immunization_campaign_facility_start_idx" ON "immunization_campaigns" USING btree ("facility_id","start_date");--> statement-breakpoint
CREATE INDEX "immunization_campaign_vaccine_round_idx" ON "immunization_campaigns" USING btree ("vaccine_code","round_number");--> statement-breakpoint
CREATE UNIQUE INDEX "vaccine_doses_unique" ON "vaccine_doses" USING btree ("vaccine_code","dose_number");--> statement-breakpoint
CREATE INDEX "vaccine_doses_milestone_idx" ON "vaccine_doses" USING btree ("milestone");--> statement-breakpoint
CREATE INDEX "vaccines_display_order_idx" ON "vaccines" USING btree ("display_order");--> statement-breakpoint
ALTER TABLE "immunization_histories" ADD CONSTRAINT "immunization_histories_administered_by_users_id_fk" FOREIGN KEY ("administered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "immunization_histories" ADD CONSTRAINT "immunization_histories_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "immunization_history_patient_vaccine_dose_unique" ON "immunization_histories" USING btree ("patient_id","vaccine_code","dose_number");--> statement-breakpoint
CREATE INDEX "immunization_history_facility_date_idx" ON "immunization_histories" USING btree ("facility_id","administered_at");