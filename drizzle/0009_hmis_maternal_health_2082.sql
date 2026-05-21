CREATE TYPE "public"."abortion_procedure_enum" AS ENUM('mva', 'eva', 'medication', 'manual_induction', 'd_and_e', 'misoprostol');--> statement-breakpoint
CREATE TYPE "public"."anc_protocol_visit_enum" AS ENUM('ANC1', 'ANC2', 'ANC3', 'ANC4', 'ANC5', 'ANC6', 'ANC7', 'ANC8');--> statement-breakpoint
CREATE TYPE "public"."birth_attendant_enum" AS ENUM('sba_anm', 'shp', 'other');--> statement-breakpoint
CREATE TYPE "public"."complication_management_enum" AS ENUM('treated', 'referred');--> statement-breakpoint
CREATE TYPE "public"."complication_stage_enum" AS ENUM('anc', 'delivery', 'pnc', 'abortion');--> statement-breakpoint
CREATE TYPE "public"."delivery_mode_enum" AS ENUM('spontaneous', 'vacuum', 'forceps', 'cs');--> statement-breakpoint
CREATE TYPE "public"."delivery_place_enum" AS ENUM('home', 'this_facility', 'other_facility', 'enroute');--> statement-breakpoint
CREATE TYPE "public"."ecological_zone_enum" AS ENUM('mountain', 'hill', 'terai');--> statement-breakpoint
CREATE TYPE "public"."family_planning_postpartum_type_enum" AS ENUM('iucd', 'implant', 'btl', 'depo', 'none');--> statement-breakpoint
CREATE TYPE "public"."fetal_presentation_enum" AS ENUM('cephalic', 'breech', 'shoulder');--> statement-breakpoint
CREATE TYPE "public"."hmis_ethnic_code_enum" AS ENUM('01_dalit', '02_janajati', '03_madhesi', '04_muslim', '05_brahmin_chhetri', '06_other');--> statement-breakpoint
CREATE TYPE "public"."labor_type_enum" AS ENUM('spontaneous', 'augmented', 'induced');--> statement-breakpoint
CREATE TYPE "public"."maternal_death_stage_enum" AS ENUM('pregnant', 'delivery', 'postnatal_42d');--> statement-breakpoint
CREATE TYPE "public"."maternal_outcome_enum" AS ENUM('recovered', 'stable', 'referred', 'lama', 'absconded', 'died');--> statement-breakpoint
CREATE TYPE "public"."neonatal_status_enum" AS ENUM('normal', 'infection', 'asphyxia', 'hypothermia', 'jaundice', 'congenital_syphilis');--> statement-breakpoint
CREATE TYPE "public"."pac_indication_enum" AS ENUM('incomplete_induced', 'incomplete_spontaneous', 'septic', 'other');--> statement-breakpoint
CREATE TYPE "public"."pnc_protocol_visit_enum" AS ENUM('PNC1', 'PNC2', 'PNC3', 'PNC4');--> statement-breakpoint
CREATE TYPE "public"."test_result_enum" AS ENUM('reactive', 'non_reactive', 'positive', 'negative', 'pending');--> statement-breakpoint
CREATE TABLE "aama_monthly_aggregates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"hmis_ethnic_code" "hmis_ethnic_code_enum",
	"anc_incentive_eligible_count" integer DEFAULT 0 NOT NULL,
	"anc_incentive_paid_count" integer DEFAULT 0 NOT NULL,
	"transport_eligible_count" integer DEFAULT 0 NOT NULL,
	"transport_paid_count" integer DEFAULT 0 NOT NULL,
	"deliveries_spontaneous" integer DEFAULT 0 NOT NULL,
	"deliveries_vacuum" integer DEFAULT 0 NOT NULL,
	"deliveries_forceps" integer DEFAULT 0 NOT NULL,
	"deliveries_cs" integer DEFAULT 0 NOT NULL,
	"deliveries_total" integer DEFAULT 0 NOT NULL,
	"breech_count" integer DEFAULT 0 NOT NULL,
	"shoulder_count" integer DEFAULT 0 NOT NULL,
	"multiple_pregnancy_count" integer DEFAULT 0 NOT NULL,
	"referred_in" integer DEFAULT 0 NOT NULL,
	"referred_out" integer DEFAULT 0 NOT NULL,
	"complications_managed" integer DEFAULT 0 NOT NULL,
	"anti_d_given" integer DEFAULT 0 NOT NULL,
	"blood_pints_total" integer DEFAULT 0 NOT NULL,
	"cabin_usage_count" integer DEFAULT 0 NOT NULL,
	"computed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "facility_population_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"fiscal_year" integer NOT NULL,
	"expected_pregnancies" integer NOT NULL,
	"expected_deliveries" integer NOT NULL,
	"target_set_by" uuid,
	"target_set_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "maternal_deaths" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"pregnancy_id" uuid,
	"death_date" date NOT NULL,
	"place" varchar(30),
	"place_detail" text,
	"stage" "maternal_death_stage_enum" NOT NULL,
	"cause_icd11_code" varchar(50),
	"cause_text" text,
	"facility_id" uuid NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "newborn_deaths" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_id" uuid,
	"delivery_child_id" uuid,
	"patient_id" uuid NOT NULL,
	"death_date" date NOT NULL,
	"age_at_death_hours" integer,
	"cause_icd11_code" varchar(50),
	"cause_text" text,
	"facility_id" uuid NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "post_abortion_cares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"safe_abortion_id" uuid,
	"patient_id" uuid NOT NULL,
	"indication" "pac_indication_enum" NOT NULL,
	"care_date" date NOT NULL,
	"fp_service_provided" varchar(40),
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
CREATE TABLE "pregnancy_complications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pregnancy_id" uuid NOT NULL,
	"stage" "complication_stage_enum" NOT NULL,
	"icd11_code" varchar(50),
	"icd11_title" text,
	"management" "complication_management_enum",
	"referred_to_facility_id" uuid,
	"notes" text,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"recorded_at_anc_id" uuid,
	"recorded_at_delivery_id" uuid,
	"recorded_at_pnc_id" uuid,
	"facility_id" uuid NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "previous_pregnancies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pregnancy_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"year" integer,
	"outcome" varchar(40),
	"delivery_mode" "delivery_mode_enum",
	"complication_icd11_code" varchar(50),
	"live_birth" boolean,
	"still_birth" boolean,
	"preterm" boolean,
	"twin" boolean,
	"abortion" boolean,
	"td_dose_received" boolean,
	"child_sex" "gender_enum",
	"child_current_age_months" integer,
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
CREATE TABLE "safe_abortion_complications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"safe_abortion_id" uuid NOT NULL,
	"icd11_code" varchar(50),
	"icd11_title" text,
	"complication_kind" varchar(60),
	"management" "complication_management_enum",
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
CREATE TABLE "safe_abortions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"procedure_date" date NOT NULL,
	"hmis_ethnic_code" "hmis_ethnic_code_enum",
	"age" integer,
	"education" varchar(50),
	"gravida_num" integer,
	"living_children_num" integer,
	"gestation_by_lmp_weeks" integer,
	"gestation_by_exam_weeks" integer,
	"procedure" "abortion_procedure_enum" NOT NULL,
	"pain_management_given" boolean,
	"visit_id" uuid,
	"encounter_id" uuid,
	"facility_id" uuid NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "antenatal_cares" ADD COLUMN "protocol_visit_number" "anc_protocol_visit_enum";--> statement-breakpoint
ALTER TABLE "antenatal_cares" ADD COLUMN "protocol_window_violation" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "antenatal_cares" ADD COLUMN "gestational_age_weeks" integer;--> statement-breakpoint
ALTER TABLE "antenatal_cares" ADD COLUMN "anaemia_present" boolean;--> statement-breakpoint
ALTER TABLE "antenatal_cares" ADD COLUMN "edema_location" varchar(20);--> statement-breakpoint
ALTER TABLE "antenatal_cares" ADD COLUMN "mother_height_cm" real;--> statement-breakpoint
ALTER TABLE "antenatal_cares" ADD COLUMN "bmi" real;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "admission_at" timestamp;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "delivery_at" timestamp;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "discharge_at" timestamp;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "labor_type" "labor_type_enum";--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "fetal_presentation" "fetal_presentation_enum";--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "delivery_mode" "delivery_mode_enum";--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "place_code" "delivery_place_enum";--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "other_facility_name" varchar(255);--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "birth_attendant" "birth_attendant_enum";--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "no_of_live_term_babies" integer;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "no_of_live_preterm_babies" integer;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "no_of_still_intrapartum" integer;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "no_of_still_antepartum" integer;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "oxytocin_given" boolean;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "kmc_given" boolean;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "early_breastfeeding_within_1h" boolean;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "anti_d_given" boolean;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "warm_bag_distributed" boolean;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "warm_bag_reason_if_not" text;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "blood_transfusion_pints" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "cabin_used" boolean;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "maternal_outcome" "maternal_outcome_enum";--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "referred_to_facility_id" uuid;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "transport_incentive_eligible" boolean;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "transport_incentive_received" boolean;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "transport_incentive_amount" integer;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "transport_incentive_reason_if_not" text;--> statement-breakpoint
ALTER TABLE "delivery_children" ADD COLUMN "sex" "gender_enum";--> statement-breakpoint
ALTER TABLE "delivery_children" ADD COLUMN "neonatal_status" "neonatal_status_enum";--> statement-breakpoint
ALTER TABLE "delivery_children" ADD COLUMN "is_term" boolean;--> statement-breakpoint
ALTER TABLE "delivery_children" ADD COLUMN "congenital_anomaly_major" boolean;--> statement-breakpoint
ALTER TABLE "delivery_children" ADD COLUMN "congenital_anomaly_minor" boolean;--> statement-breakpoint
ALTER TABLE "delivery_children" ADD COLUMN "congenital_anomaly_other_count" integer;--> statement-breakpoint
ALTER TABLE "delivery_children" ADD COLUMN "congenital_anomaly_icd_code" varchar(50);--> statement-breakpoint
ALTER TABLE "health_facilities" ADD COLUMN "ecological_zone" "ecological_zone_enum";--> statement-breakpoint
ALTER TABLE "postnatal_cares" ADD COLUMN "protocol_visit_number" "pnc_protocol_visit_enum";--> statement-breakpoint
ALTER TABLE "postnatal_cares" ADD COLUMN "location_code" varchar(20);--> statement-breakpoint
ALTER TABLE "postnatal_cares" ADD COLUMN "family_planning_service_type" "family_planning_postpartum_type_enum";--> statement-breakpoint
ALTER TABLE "postnatal_cares" ADD COLUMN "fp_given_within_48h" boolean;--> statement-breakpoint
ALTER TABLE "postnatal_cares" ADD COLUMN "fp_given_within_42d" boolean;--> statement-breakpoint
ALTER TABLE "postnatal_cares" ADD COLUMN "vitamin_k_date" date;--> statement-breakpoint
ALTER TABLE "postnatal_cares" ADD COLUMN "postnatal_blood_transfusion_pints" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD COLUMN "hmis_ethnic_code" "hmis_ethnic_code_enum";--> statement-breakpoint
ALTER TABLE "pregnancies" ADD COLUMN "gravida_num" integer;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD COLUMN "para_num" integer;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD COLUMN "abortions_num" integer;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD COLUMN "living_children_num" integer;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD COLUMN "rousg_first_date" date;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD COLUMN "hiv_test_date" date;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD COLUMN "hiv_result" "test_result_enum";--> statement-breakpoint
ALTER TABLE "pregnancies" ADD COLUMN "hiv_treatment_or_referral" text;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD COLUMN "hbsag_test_date" date;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD COLUMN "hbsag_result" "test_result_enum";--> statement-breakpoint
ALTER TABLE "pregnancies" ADD COLUMN "hbsag_treatment_or_referral" text;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD COLUMN "syphilis_treponemal_date" date;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD COLUMN "syphilis_treponemal_result" "test_result_enum";--> statement-breakpoint
ALTER TABLE "pregnancies" ADD COLUMN "syphilis_nontreponemal_date" date;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD COLUMN "syphilis_nontreponemal_result" "test_result_enum";--> statement-breakpoint
ALTER TABLE "pregnancies" ADD COLUMN "syphilis_treatment_or_referral" text;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD COLUMN "tb_sputum_test_date" date;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD COLUMN "deworming_date" date;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD COLUMN "td1_date" date;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD COLUMN "td2_date" date;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD COLUMN "td2plus_date" date;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD COLUMN "anc_incentive_eligible" boolean;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD COLUMN "anc_incentive_received" boolean;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD COLUMN "anc_incentive_amount" integer;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD COLUMN "anc_incentive_reason_if_not" text;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD COLUMN "anc_incentive_paid_at" date;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD COLUMN "hmis_compliant" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "aama_monthly_aggregates" ADD CONSTRAINT "aama_monthly_aggregates_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_population_targets" ADD CONSTRAINT "facility_population_targets_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_population_targets" ADD CONSTRAINT "facility_population_targets_target_set_by_users_id_fk" FOREIGN KEY ("target_set_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maternal_deaths" ADD CONSTRAINT "maternal_deaths_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maternal_deaths" ADD CONSTRAINT "maternal_deaths_pregnancy_id_pregnancies_id_fk" FOREIGN KEY ("pregnancy_id") REFERENCES "public"."pregnancies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maternal_deaths" ADD CONSTRAINT "maternal_deaths_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maternal_deaths" ADD CONSTRAINT "maternal_deaths_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maternal_deaths" ADD CONSTRAINT "maternal_deaths_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newborn_deaths" ADD CONSTRAINT "newborn_deaths_delivery_id_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."deliveries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newborn_deaths" ADD CONSTRAINT "newborn_deaths_delivery_child_id_delivery_children_id_fk" FOREIGN KEY ("delivery_child_id") REFERENCES "public"."delivery_children"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newborn_deaths" ADD CONSTRAINT "newborn_deaths_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newborn_deaths" ADD CONSTRAINT "newborn_deaths_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newborn_deaths" ADD CONSTRAINT "newborn_deaths_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newborn_deaths" ADD CONSTRAINT "newborn_deaths_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_abortion_cares" ADD CONSTRAINT "post_abortion_cares_safe_abortion_id_safe_abortions_id_fk" FOREIGN KEY ("safe_abortion_id") REFERENCES "public"."safe_abortions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_abortion_cares" ADD CONSTRAINT "post_abortion_cares_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_abortion_cares" ADD CONSTRAINT "post_abortion_cares_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_abortion_cares" ADD CONSTRAINT "post_abortion_cares_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_abortion_cares" ADD CONSTRAINT "post_abortion_cares_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pregnancy_complications" ADD CONSTRAINT "pregnancy_complications_pregnancy_id_pregnancies_id_fk" FOREIGN KEY ("pregnancy_id") REFERENCES "public"."pregnancies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pregnancy_complications" ADD CONSTRAINT "pregnancy_complications_referred_to_facility_id_health_facilities_id_fk" FOREIGN KEY ("referred_to_facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pregnancy_complications" ADD CONSTRAINT "pregnancy_complications_recorded_at_anc_id_antenatal_cares_id_fk" FOREIGN KEY ("recorded_at_anc_id") REFERENCES "public"."antenatal_cares"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pregnancy_complications" ADD CONSTRAINT "pregnancy_complications_recorded_at_delivery_id_deliveries_id_fk" FOREIGN KEY ("recorded_at_delivery_id") REFERENCES "public"."deliveries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pregnancy_complications" ADD CONSTRAINT "pregnancy_complications_recorded_at_pnc_id_postnatal_cares_id_fk" FOREIGN KEY ("recorded_at_pnc_id") REFERENCES "public"."postnatal_cares"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pregnancy_complications" ADD CONSTRAINT "pregnancy_complications_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pregnancy_complications" ADD CONSTRAINT "pregnancy_complications_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pregnancy_complications" ADD CONSTRAINT "pregnancy_complications_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "previous_pregnancies" ADD CONSTRAINT "previous_pregnancies_pregnancy_id_pregnancies_id_fk" FOREIGN KEY ("pregnancy_id") REFERENCES "public"."pregnancies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "previous_pregnancies" ADD CONSTRAINT "previous_pregnancies_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "previous_pregnancies" ADD CONSTRAINT "previous_pregnancies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "previous_pregnancies" ADD CONSTRAINT "previous_pregnancies_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safe_abortion_complications" ADD CONSTRAINT "safe_abortion_complications_safe_abortion_id_safe_abortions_id_fk" FOREIGN KEY ("safe_abortion_id") REFERENCES "public"."safe_abortions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safe_abortion_complications" ADD CONSTRAINT "safe_abortion_complications_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safe_abortion_complications" ADD CONSTRAINT "safe_abortion_complications_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safe_abortion_complications" ADD CONSTRAINT "safe_abortion_complications_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safe_abortions" ADD CONSTRAINT "safe_abortions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safe_abortions" ADD CONSTRAINT "safe_abortions_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safe_abortions" ADD CONSTRAINT "safe_abortions_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safe_abortions" ADD CONSTRAINT "safe_abortions_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safe_abortions" ADD CONSTRAINT "safe_abortions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safe_abortions" ADD CONSTRAINT "safe_abortions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "aama_monthly_unique" ON "aama_monthly_aggregates" USING btree ("facility_id","year","month","hmis_ethnic_code");--> statement-breakpoint
CREATE UNIQUE INDEX "facility_population_target_unique" ON "facility_population_targets" USING btree ("facility_id","fiscal_year");--> statement-breakpoint
CREATE INDEX "maternal_death_patient_idx" ON "maternal_deaths" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "maternal_death_facility_date_idx" ON "maternal_deaths" USING btree ("facility_id","death_date");--> statement-breakpoint
CREATE INDEX "newborn_death_facility_date_idx" ON "newborn_deaths" USING btree ("facility_id","death_date");--> statement-breakpoint
CREATE INDEX "newborn_death_patient_idx" ON "newborn_deaths" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "pac_facility_date_idx" ON "post_abortion_cares" USING btree ("facility_id","care_date");--> statement-breakpoint
CREATE INDEX "pac_patient_idx" ON "post_abortion_cares" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "pregnancy_complication_pregnancy_idx" ON "pregnancy_complications" USING btree ("pregnancy_id");--> statement-breakpoint
CREATE INDEX "pregnancy_complication_stage_icd_idx" ON "pregnancy_complications" USING btree ("stage","icd11_code");--> statement-breakpoint
CREATE INDEX "pregnancy_complication_facility_recorded_at_idx" ON "pregnancy_complications" USING btree ("facility_id","recorded_at");--> statement-breakpoint
CREATE INDEX "previous_pregnancy_pregnancy_idx" ON "previous_pregnancies" USING btree ("pregnancy_id");--> statement-breakpoint
CREATE INDEX "safe_abortion_complication_abortion_idx" ON "safe_abortion_complications" USING btree ("safe_abortion_id");--> statement-breakpoint
CREATE INDEX "safe_abortion_patient_idx" ON "safe_abortions" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "safe_abortion_facility_date_idx" ON "safe_abortions" USING btree ("facility_id","procedure_date");--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_referred_to_facility_id_health_facilities_id_fk" FOREIGN KEY ("referred_to_facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "antenatal_care_protocol_visit_idx" ON "antenatal_cares" USING btree ("pregnancy_id","protocol_visit_number");--> statement-breakpoint
CREATE INDEX "delivery_mode_idx" ON "deliveries" USING btree ("delivery_mode");--> statement-breakpoint
CREATE INDEX "delivery_place_idx" ON "deliveries" USING btree ("place_code");--> statement-breakpoint
CREATE INDEX "postnatal_care_protocol_visit_idx" ON "postnatal_cares" USING btree ("pregnancy_id","protocol_visit_number");