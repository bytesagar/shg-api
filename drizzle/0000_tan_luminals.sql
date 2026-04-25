CREATE TYPE "public"."age_unit_enum" AS ENUM('years', 'months', 'days');--> statement-breakpoint
CREATE TYPE "public"."appointment_status_enum" AS ENUM('scheduled', 'confirmed', 'cancelled', 'completed', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."auth_session_status_enum" AS ENUM('active', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."call_request_status_enum" AS ENUM('pending', 'accepted', 'declined', 'completed');--> statement-breakpoint
CREATE TYPE "public"."caste_enum" AS ENUM('dalit', 'janajati', 'madhesi', 'muslim', 'brahmin_chhetri', 'other');--> statement-breakpoint
CREATE TYPE "public"."consent_status_enum" AS ENUM('granted', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."duration_unit_enum" AS ENUM('hours', 'days', 'weeks', 'months', 'years');--> statement-breakpoint
CREATE TYPE "public"."family_planning_device_enum" AS ENUM('condom', 'pills', 'depo', 'iucd', 'implant', 'vasectomy', 'minilap', 'none');--> statement-breakpoint
CREATE TYPE "public"."family_planning_service_type_enum" AS ENUM('new', 'follow_up', 'removal');--> statement-breakpoint
CREATE TYPE "public"."fp_usage_time_period_enum" AS ENUM('within_45_days', 'after_45_days');--> statement-breakpoint
CREATE TYPE "public"."gender_enum" AS ENUM('male', 'female', 'other');--> statement-breakpoint
CREATE TYPE "public"."log_level_enum" AS ENUM('info', 'warn', 'error', 'debug');--> statement-breakpoint
CREATE TYPE "public"."patient_status_enum" AS ENUM('active', 'inactive', 'deceased', 'discharged', 'referred');--> statement-breakpoint
CREATE TYPE "public"."person_status_enum" AS ENUM('active', 'inactive', 'deceased');--> statement-breakpoint
CREATE TYPE "public"."severity_enum" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."test_category_enum" AS ENUM('lab', 'imaging', 'other');--> statement-breakpoint
CREATE TYPE "public"."user_account_status_enum" AS ENUM('active', 'inactive', 'locked');--> statement-breakpoint
CREATE TYPE "public"."user_role_enum" AS ENUM('admin', 'user', 'facility', 'doctor');--> statement-breakpoint
CREATE TYPE "public"."visit_status_enum" AS ENUM('planned', 'arrived', 'in_progress', 'finished', 'cancelled');--> statement-breakpoint
CREATE TABLE "antenatal_cares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"anc_visit_date" timestamp,
	"visiting_time_week" varchar(50),
	"visiting_time_month" varchar(50),
	"mother_weight" real,
	"anemia" integer,
	"edema" integer,
	"systolic" integer,
	"diastolic" integer,
	"pregnancy_period_week" varchar(50),
	"fundal_height" real,
	"baby_presentation" varchar(255),
	"heart_rate" integer,
	"other_problems" text,
	"treatment" text,
	"medical_advice" text,
	"next_visit_schedule" timestamp,
	"iron_tablet" integer,
	"albendazole" integer,
	"td_vaccination" varchar(255),
	"obstructive_complications" text,
	"obstructive_complications_other" text,
	"danger_sign" text,
	"danger_sign_other" text,
	"patient_id" uuid NOT NULL,
	"pregnancy_id" uuid NOT NULL,
	"document_url" varchar(500),
	"doctor_feedback" text,
	"refer" varchar(255),
	"refer_reason" text,
	"calcium" integer,
	"folic_acid" integer,
	"investigation" text,
	"service_provided_by" uuid,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"facility_id" uuid,
	"date" timestamp NOT NULL,
	"status" "appointment_status_enum" DEFAULT 'scheduled' NOT NULL,
	"service" varchar(255),
	"consent" integer DEFAULT 1,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_type" varchar(50) NOT NULL,
	"source_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	"name" varchar(500) NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer,
	"file_type" varchar(255),
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"actor_person_id" uuid,
	"patient_id" uuid,
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(100),
	"resource_id" uuid,
	"outcome" varchar(50),
	"facility_id" uuid,
	"ip_address" varchar(50),
	"user_agent" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"refresh_token_hash" varchar(255) NOT NULL,
	"status" "auth_session_status_enum" DEFAULT 'active' NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"revoked_reason" varchar(255),
	"last_used_at" timestamp,
	"ip_address" varchar(50),
	"user_agent" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "call_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_user_id" uuid,
	"to_user_id" uuid,
	"patient_id" uuid,
	"status" "call_request_status_enum" DEFAULT 'pending',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "child_immunizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mothers_name" varchar(255),
	"fathers_name" varchar(255),
	"weight_at_birth" real,
	"patient_id" uuid NOT NULL,
	"facility_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "complaints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(500) NOT NULL,
	"duration" integer,
	"duration_unit" "duration_unit_enum" NOT NULL,
	"severity" "severity_enum" NOT NULL,
	"description" text NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" uuid NOT NULL,
	"encounter_id" uuid,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "confirm_diagnoses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"icd_code" varchar(50),
	"description" text NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" uuid NOT NULL,
	"encounter_id" uuid,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"person_id" uuid,
	"purpose" varchar(100) NOT NULL,
	"scope" varchar(100) NOT NULL,
	"status" "consent_status_enum" DEFAULT 'granted' NOT NULL,
	"granted_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	"expires_at" timestamp,
	"granted_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_date" timestamp,
	"place_of_delivery" varchar(255),
	"other_place_of_delivery" varchar(255),
	"baby_presentation" varchar(255),
	"type_of_delivery" varchar(255),
	"no_of_live_male_baby" integer,
	"no_of_live_female_baby" integer,
	"no_of_still_male_baby" integer,
	"no_of_still_female_baby" integer,
	"no_of_fresh_still_birth" integer,
	"no_of_macerated_still_birth" integer,
	"delivery_attended_by" varchar(255),
	"other_problems" text,
	"treatment" text,
	"investigation" text,
	"doctor_feedback" text,
	"refer" varchar(255),
	"refer_reason" text,
	"vitamin_k" integer,
	"umbilical_cream" integer,
	"patient_id" uuid NOT NULL,
	"pregnancy_id" uuid NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "delivery_children" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_id" uuid NOT NULL,
	"weight_of_baby" real,
	"new_born_baby_status" varchar(255),
	"patient_id" uuid NOT NULL,
	"pregnancy_id" uuid NOT NULL,
	"apgar_score_1" integer,
	"apgar_score_2" integer,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "districts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"province_id" uuid NOT NULL,
	"code" integer NOT NULL,
	"name" jsonb NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(500),
	"path" text,
	"patient_id" uuid NOT NULL,
	"visit_id" uuid,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
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
CREATE TABLE "family_planning_news" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_planning_id" uuid NOT NULL,
	"last_menstrual_period" timestamp,
	"previous_device_id" uuid,
	"device_planned" "family_planning_device_enum" NOT NULL,
	"device_used" "family_planning_device_enum" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"device_not_used_reason" text,
	"usage_time_period" "fp_usage_time_period_enum",
	"usage_date" timestamp,
	"follow_up_date" timestamp,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "family_planning_olds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"previous_device" "family_planning_device_enum",
	"continue_same_device" boolean,
	"discontinue_reason" text,
	"discontinue_reason_other" text,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "family_planning_removals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_planning_id" uuid NOT NULL,
	"previous_device_id" uuid,
	"last_menstrual_period" timestamp,
	"removal_date" timestamp NOT NULL,
	"place_of_fp_device_used" varchar(255),
	"other_health_facility_name" varchar(255),
	"removal_reason" text,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "family_plannings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_date" timestamp NOT NULL,
	"patient_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	"service_type" "family_planning_service_type_enum" NOT NULL,
	"service_provider_id" uuid,
	"service_provider_first_name" varchar(255),
	"service_provider_last_name" varchar(255),
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "fp_hormonal_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"new_fp_id" uuid NOT NULL,
	"swelling_leg_or_breath_shortness" boolean NOT NULL,
	"pain_swelling_leg_pregnancy" boolean NOT NULL,
	"regular_menstrual_bleeding" boolean NOT NULL,
	"menstruation_bleeding_amount" boolean NOT NULL,
	"bleeding_between_periods" boolean NOT NULL,
	"jaundice" boolean NOT NULL,
	"diabetes" boolean NOT NULL,
	"severe_headache" boolean NOT NULL,
	"lump_or_swelling_breast" boolean NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "fp_iucd_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"new_fp_id" uuid NOT NULL,
	"lower_abdominal_pain" boolean NOT NULL,
	"foul_smelling_vaginal_discharge" boolean NOT NULL,
	"treated_for_reproductive_tract_infection" boolean NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "growths" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" timestamp NOT NULL,
	"weight" real,
	"height" real,
	"muac" real,
	"patient_id" uuid NOT NULL,
	"child_immunization_id" uuid,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "health_facilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text NOT NULL,
	"phone" varchar(50) NOT NULL,
	"email" varchar(255) NOT NULL,
	"ward" varchar(100) NOT NULL,
	"palika" varchar(255) NOT NULL,
	"district" varchar(255) NOT NULL,
	"province" varchar(255) NOT NULL,
	"province_id" uuid,
	"district_id" uuid,
	"municipality_id" uuid,
	"incharge_name" varchar(255) NOT NULL,
	"hf_code" varchar(100),
	"authority_level" varchar(100),
	"authority" varchar(255),
	"ownership" varchar(255),
	"facility_type" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "health_facility_registries" (
	"code" varchar(100) PRIMARY KEY NOT NULL,
	"name" jsonb NOT NULL,
	"municipality_id" uuid NOT NULL,
	"authority" varchar(255) NOT NULL,
	"ownership" varchar(255) NOT NULL,
	"level" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "histories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"medical" text NOT NULL,
	"surgical" text NOT NULL,
	"ob_gyn" text NOT NULL,
	"medication" text NOT NULL,
	"family_history" text NOT NULL,
	"social" text NOT NULL,
	"other" text,
	"visit_id" uuid NOT NULL,
	"encounter_id" uuid,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "home_baby_postnatal_cares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visiting_time" varchar(100) NOT NULL,
	"visit_time" varchar(100) NOT NULL,
	"visit_date" timestamp NOT NULL,
	"activities" text NOT NULL,
	"respiration" integer NOT NULL,
	"temperature" real NOT NULL,
	"umbilical_area" text NOT NULL,
	"skin" text NOT NULL,
	"eye" text NOT NULL,
	"jaundice" text NOT NULL,
	"breast_feeding" text NOT NULL,
	"stool" text NOT NULL,
	"urination" text NOT NULL,
	"umbilical_cream" text,
	"health_care_provider" varchar(255) NOT NULL,
	"patient_id" uuid NOT NULL,
	"pregnancy_id" uuid NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "home_mother_postnatal_cares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visiting_time" varchar(100) NOT NULL,
	"visit_time" varchar(100) NOT NULL,
	"visit_date" timestamp NOT NULL,
	"pulse" real NOT NULL,
	"body_temperature" real NOT NULL,
	"bp_systolic" integer NOT NULL,
	"bp_diastolic" integer NOT NULL,
	"pp_haemorage" text NOT NULL,
	"pp_haemorage_treatment" text NOT NULL,
	"breast_examination" text NOT NULL,
	"edema" text NOT NULL,
	"examination_of_uterus" text NOT NULL,
	"vaginal_examination" text NOT NULL,
	"urination_difficulties" text NOT NULL,
	"vaginal_discharge" text,
	"patient_id" uuid NOT NULL,
	"pregnancy_id" uuid NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "icd11_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"title" text NOT NULL,
	"category" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "immunization_histories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vaccine_name" varchar(255) NOT NULL,
	"date" timestamp NOT NULL,
	"vaccinated" integer,
	"aefi" text,
	"vaccinated_date" timestamp,
	"patient_id" uuid NOT NULL,
	"child_immunization_id" uuid NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "jaas_webhook_idempotency" (
	"idempotency_key" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(100),
	"medicine_name" varchar(500),
	"dosage" varchar(255),
	"times" varchar(100),
	"route" varchar(100),
	"before_after" varchar(50),
	"duration" varchar(100),
	"special_notes" text,
	"patient_id" uuid NOT NULL,
	"visit_id" uuid NOT NULL,
	"encounter_id" uuid,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "municipalities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"district_id" uuid NOT NULL,
	"code" integer NOT NULL,
	"name" jsonb NOT NULL,
	"no_of_wards" integer NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"seen" boolean DEFAULT false NOT NULL,
	"module" varchar(100),
	"module_id" uuid,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "password_resets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" varchar(512) NOT NULL,
	"expires" timestamp,
	"user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "patient_identifiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"system" varchar(255) NOT NULL,
	"value" varchar(255) NOT NULL,
	"use" varchar(50),
	"is_primary" boolean DEFAULT false NOT NULL,
	"period_start" timestamp,
	"period_end" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"patient_id" varchar(100) NOT NULL,
	"service" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"deleted_at" timestamp,
	"facility_id" uuid,
	"assigned_user_id" uuid,
	"status" "patient_status_enum" DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "person_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"use" varchar(50),
	"line1" varchar(255),
	"line2" varchar(255),
	"municipality" varchar(255),
	"district" varchar(255),
	"province" varchar(255),
	"ward" integer,
	"postal_code" varchar(20),
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "person_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"system" varchar(20) NOT NULL,
	"use" varchar(50),
	"rank" integer,
	"value" varchar(255) NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "person_identifiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"system" varchar(255) NOT NULL,
	"value" varchar(255) NOT NULL,
	"use" varchar(50),
	"is_primary" boolean DEFAULT false NOT NULL,
	"period_start" timestamp,
	"period_end" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "person_names" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"use" varchar(50),
	"family" varchar(255),
	"given" varchar(255),
	"middle" varchar(255),
	"prefix" varchar(50),
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "persons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gender" "gender_enum",
	"birth_date" timestamp,
	"deceased_at" timestamp,
	"status" "person_status_enum" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "physical_examinations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"general_condition" text NOT NULL,
	"chest" text NOT NULL,
	"cvs" text NOT NULL,
	"cns" text NOT NULL,
	"perabdominal" text NOT NULL,
	"local_examination" text NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" uuid NOT NULL,
	"encounter_id" uuid,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "postnatal_cares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visiting_time" varchar(100) NOT NULL,
	"visit_time" varchar(100) NOT NULL,
	"visit_date" timestamp NOT NULL,
	"condition_of_mother" text NOT NULL,
	"condition_of_baby" text NOT NULL,
	"medical_advice" text NOT NULL,
	"family_planning_services" text NOT NULL,
	"complications" text NOT NULL,
	"danger_signs_on_mother" text NOT NULL,
	"danger_signs_on_baby" text NOT NULL,
	"checkup_attended_by" varchar(255) NOT NULL,
	"new_born_baby_status" varchar(255) NOT NULL,
	"refer" varchar(255),
	"refer_reason" text,
	"other_problems" text,
	"treatment" text NOT NULL,
	"investigation" text,
	"doctor_feedback" text,
	"iron_tablet" integer,
	"calcium" integer,
	"patient_id" uuid NOT NULL,
	"pregnancy_id" uuid NOT NULL,
	"service_provided_by" uuid,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "practitioner_role_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"practitioner_id" uuid NOT NULL,
	"facility_id" uuid,
	"municipality_id" uuid,
	"role_code" varchar(100) NOT NULL,
	"specialty" varchar(255),
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "practitioners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"user_id" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "pregnancies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_visit" timestamp NOT NULL,
	"gravida" varchar(50) NOT NULL,
	"para" varchar(50),
	"last_menstruation_period" timestamp,
	"expected_delivery_date" timestamp,
	"patient_id" uuid NOT NULL,
	"facility_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp,
	"assigned_fchv_id" uuid
);
--> statement-breakpoint
CREATE TABLE "provinces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" jsonb NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "provisional_diagnoses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"description" text NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" uuid NOT NULL,
	"encounter_id" uuid,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "rosters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	"date" timestamp NOT NULL,
	"from_time" varchar(50) NOT NULL,
	"to_time" varchar(50) NOT NULL,
	"service" varchar(255) NOT NULL,
	"status" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sms_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"schedule_date" timestamp NOT NULL,
	"delivery_date" timestamp,
	"sms_body" text,
	"status" integer DEFAULT 0 NOT NULL,
	"phone" varchar(50),
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "system_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"level" "log_level_enum" NOT NULL,
	"message" text NOT NULL,
	"resource" varchar(100),
	"meta" jsonb,
	"user_id" uuid,
	"ip_address" varchar(50),
	"method" varchar(10),
	"path" varchar(255),
	"status_code" integer,
	"duration" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telehealth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"provider" varchar(50),
	"room_name" varchar(255),
	"started_at" timestamp,
	"ended_at" timestamp,
	"duration_seconds" integer DEFAULT 0,
	"jaas_session_id" varchar(255),
	CONSTRAINT "telehealth_sessions_appointment_id_unique" UNIQUE("appointment_id")
);
--> statement-breakpoint
CREATE TABLE "tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_name" varchar(255) NOT NULL,
	"test_result" text,
	"test_category" "test_category_enum" NOT NULL,
	"visit_id" uuid NOT NULL,
	"encounter_id" uuid,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "treatments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"medical_advise" text,
	"follow_up_text" text,
	"follow_up_date" timestamp,
	"refer" varchar(255),
	"refer_reason" text,
	"patient_id" uuid NOT NULL,
	"visit_id" uuid NOT NULL,
	"encounter_id" uuid,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"designation" varchar(255),
	"specialization" varchar(255),
	"signature_url" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_role_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"facility_id" uuid,
	"municipality_id" uuid,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(255),
	"person_id" uuid NOT NULL,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"account_status" "user_account_status_enum" DEFAULT 'active' NOT NULL,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp,
	"last_login_at" timestamp,
	"user_type" "user_role_enum" NOT NULL,
	"phone_number" varchar(50) NOT NULL,
	"designation" varchar(255),
	"call_status" integer,
	"facility_id" uuid,
	"municipality_id" uuid,
	"user_role_id" uuid,
	"specialization" varchar(255),
	"nmc_registration_number" varchar(100),
	"signature_url" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" timestamp NOT NULL,
	"reason" text NOT NULL,
	"service" varchar(255),
	"status" "visit_status_enum" DEFAULT 'planned',
	"patient_id" uuid NOT NULL,
	"facility_id" uuid,
	"follow_up_id" uuid,
	"doctor_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "vitals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"diastolic" integer,
	"systolic" integer,
	"temperature" real NOT NULL,
	"pulse" integer,
	"respiratory_rate" integer NOT NULL,
	"spo2" integer NOT NULL,
	"weight" real,
	"height" real,
	"visit_id" uuid NOT NULL,
	"encounter_id" uuid,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "antenatal_cares" ADD CONSTRAINT "antenatal_cares_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "antenatal_cares" ADD CONSTRAINT "antenatal_cares_pregnancy_id_pregnancies_id_fk" FOREIGN KEY ("pregnancy_id") REFERENCES "public"."pregnancies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "antenatal_cares" ADD CONSTRAINT "antenatal_cares_service_provided_by_users_id_fk" FOREIGN KEY ("service_provided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "antenatal_cares" ADD CONSTRAINT "antenatal_cares_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "antenatal_cares" ADD CONSTRAINT "antenatal_cares_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_person_id_persons_id_fk" FOREIGN KEY ("actor_person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_requests" ADD CONSTRAINT "call_requests_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_requests" ADD CONSTRAINT "call_requests_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_requests" ADD CONSTRAINT "call_requests_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "child_immunizations" ADD CONSTRAINT "child_immunizations_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "child_immunizations" ADD CONSTRAINT "child_immunizations_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confirm_diagnoses" ADD CONSTRAINT "confirm_diagnoses_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confirm_diagnoses" ADD CONSTRAINT "confirm_diagnoses_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confirm_diagnoses" ADD CONSTRAINT "confirm_diagnoses_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confirm_diagnoses" ADD CONSTRAINT "confirm_diagnoses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confirm_diagnoses" ADD CONSTRAINT "confirm_diagnoses_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_granted_by_user_id_users_id_fk" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_pregnancy_id_pregnancies_id_fk" FOREIGN KEY ("pregnancy_id") REFERENCES "public"."pregnancies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_children" ADD CONSTRAINT "delivery_children_delivery_id_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."deliveries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_children" ADD CONSTRAINT "delivery_children_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_children" ADD CONSTRAINT "delivery_children_pregnancy_id_pregnancies_id_fk" FOREIGN KEY ("pregnancy_id") REFERENCES "public"."pregnancies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_children" ADD CONSTRAINT "delivery_children_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_children" ADD CONSTRAINT "delivery_children_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "districts" ADD CONSTRAINT "districts_province_id_provinces_id_fk" FOREIGN KEY ("province_id") REFERENCES "public"."provinces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_planning_news" ADD CONSTRAINT "family_planning_news_family_planning_id_family_plannings_id_fk" FOREIGN KEY ("family_planning_id") REFERENCES "public"."family_plannings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_planning_news" ADD CONSTRAINT "family_planning_news_previous_device_id_family_planning_olds_id_fk" FOREIGN KEY ("previous_device_id") REFERENCES "public"."family_planning_olds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_planning_news" ADD CONSTRAINT "family_planning_news_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_planning_news" ADD CONSTRAINT "family_planning_news_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_planning_news" ADD CONSTRAINT "family_planning_news_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_planning_olds" ADD CONSTRAINT "family_planning_olds_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_planning_olds" ADD CONSTRAINT "family_planning_olds_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_planning_olds" ADD CONSTRAINT "family_planning_olds_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_planning_removals" ADD CONSTRAINT "family_planning_removals_family_planning_id_family_plannings_id_fk" FOREIGN KEY ("family_planning_id") REFERENCES "public"."family_plannings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_planning_removals" ADD CONSTRAINT "family_planning_removals_previous_device_id_family_planning_olds_id_fk" FOREIGN KEY ("previous_device_id") REFERENCES "public"."family_planning_olds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_planning_removals" ADD CONSTRAINT "family_planning_removals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_planning_removals" ADD CONSTRAINT "family_planning_removals_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_planning_removals" ADD CONSTRAINT "family_planning_removals_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_plannings" ADD CONSTRAINT "family_plannings_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_plannings" ADD CONSTRAINT "family_plannings_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_plannings" ADD CONSTRAINT "family_plannings_service_provider_id_users_id_fk" FOREIGN KEY ("service_provider_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_plannings" ADD CONSTRAINT "family_plannings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_plannings" ADD CONSTRAINT "family_plannings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_plannings" ADD CONSTRAINT "family_plannings_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fp_hormonal_details" ADD CONSTRAINT "fp_hormonal_details_new_fp_id_family_planning_news_id_fk" FOREIGN KEY ("new_fp_id") REFERENCES "public"."family_planning_news"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fp_iucd_details" ADD CONSTRAINT "fp_iucd_details_new_fp_id_family_planning_news_id_fk" FOREIGN KEY ("new_fp_id") REFERENCES "public"."family_planning_news"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growths" ADD CONSTRAINT "growths_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growths" ADD CONSTRAINT "growths_child_immunization_id_child_immunizations_id_fk" FOREIGN KEY ("child_immunization_id") REFERENCES "public"."child_immunizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growths" ADD CONSTRAINT "growths_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growths" ADD CONSTRAINT "growths_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_facilities" ADD CONSTRAINT "health_facilities_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_facility_registries" ADD CONSTRAINT "health_facility_registries_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "histories" ADD CONSTRAINT "histories_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "histories" ADD CONSTRAINT "histories_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "histories" ADD CONSTRAINT "histories_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "histories" ADD CONSTRAINT "histories_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "histories" ADD CONSTRAINT "histories_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_baby_postnatal_cares" ADD CONSTRAINT "home_baby_postnatal_cares_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_baby_postnatal_cares" ADD CONSTRAINT "home_baby_postnatal_cares_pregnancy_id_pregnancies_id_fk" FOREIGN KEY ("pregnancy_id") REFERENCES "public"."pregnancies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_baby_postnatal_cares" ADD CONSTRAINT "home_baby_postnatal_cares_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_baby_postnatal_cares" ADD CONSTRAINT "home_baby_postnatal_cares_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_mother_postnatal_cares" ADD CONSTRAINT "home_mother_postnatal_cares_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_mother_postnatal_cares" ADD CONSTRAINT "home_mother_postnatal_cares_pregnancy_id_pregnancies_id_fk" FOREIGN KEY ("pregnancy_id") REFERENCES "public"."pregnancies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_mother_postnatal_cares" ADD CONSTRAINT "home_mother_postnatal_cares_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_mother_postnatal_cares" ADD CONSTRAINT "home_mother_postnatal_cares_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "immunization_histories" ADD CONSTRAINT "immunization_histories_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "immunization_histories" ADD CONSTRAINT "immunization_histories_child_immunization_id_child_immunizations_id_fk" FOREIGN KEY ("child_immunization_id") REFERENCES "public"."child_immunizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "immunization_histories" ADD CONSTRAINT "immunization_histories_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "immunization_histories" ADD CONSTRAINT "immunization_histories_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "municipalities" ADD CONSTRAINT "municipalities_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_identifiers" ADD CONSTRAINT "patient_identifiers_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_addresses" ADD CONSTRAINT "person_addresses_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_contacts" ADD CONSTRAINT "person_contacts_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_identifiers" ADD CONSTRAINT "person_identifiers_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_names" ADD CONSTRAINT "person_names_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_examinations" ADD CONSTRAINT "physical_examinations_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_examinations" ADD CONSTRAINT "physical_examinations_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_examinations" ADD CONSTRAINT "physical_examinations_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_examinations" ADD CONSTRAINT "physical_examinations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_examinations" ADD CONSTRAINT "physical_examinations_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postnatal_cares" ADD CONSTRAINT "postnatal_cares_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postnatal_cares" ADD CONSTRAINT "postnatal_cares_pregnancy_id_pregnancies_id_fk" FOREIGN KEY ("pregnancy_id") REFERENCES "public"."pregnancies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postnatal_cares" ADD CONSTRAINT "postnatal_cares_service_provided_by_users_id_fk" FOREIGN KEY ("service_provided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postnatal_cares" ADD CONSTRAINT "postnatal_cares_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postnatal_cares" ADD CONSTRAINT "postnatal_cares_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practitioner_role_assignments" ADD CONSTRAINT "practitioner_role_assignments_practitioner_id_practitioners_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practitioner_role_assignments" ADD CONSTRAINT "practitioner_role_assignments_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practitioner_role_assignments" ADD CONSTRAINT "practitioner_role_assignments_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practitioners" ADD CONSTRAINT "practitioners_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practitioners" ADD CONSTRAINT "practitioners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD CONSTRAINT "pregnancies_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD CONSTRAINT "pregnancies_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD CONSTRAINT "pregnancies_assigned_fchv_id_users_id_fk" FOREIGN KEY ("assigned_fchv_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provisional_diagnoses" ADD CONSTRAINT "provisional_diagnoses_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provisional_diagnoses" ADD CONSTRAINT "provisional_diagnoses_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provisional_diagnoses" ADD CONSTRAINT "provisional_diagnoses_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provisional_diagnoses" ADD CONSTRAINT "provisional_diagnoses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provisional_diagnoses" ADD CONSTRAINT "provisional_diagnoses_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rosters" ADD CONSTRAINT "rosters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rosters" ADD CONSTRAINT "rosters_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rosters" ADD CONSTRAINT "rosters_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rosters" ADD CONSTRAINT "rosters_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_logs" ADD CONSTRAINT "sms_logs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_logs" ADD CONSTRAINT "sms_logs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_logs" ADD CONSTRAINT "sms_logs_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telehealth_sessions" ADD CONSTRAINT "telehealth_sessions_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tests" ADD CONSTRAINT "tests_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tests" ADD CONSTRAINT "tests_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tests" ADD CONSTRAINT "tests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tests" ADD CONSTRAINT "tests_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tests" ADD CONSTRAINT "tests_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_role_id_user_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."user_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_user_role_id_user_roles_id_fk" FOREIGN KEY ("user_role_id") REFERENCES "public"."user_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vitals" ADD CONSTRAINT "vitals_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vitals" ADD CONSTRAINT "vitals_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vitals" ADD CONSTRAINT "vitals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vitals" ADD CONSTRAINT "vitals_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vitals" ADD CONSTRAINT "vitals_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "antenatal_care_patient_id_idx" ON "antenatal_cares" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "antenatal_care_pregnancy_id_idx" ON "antenatal_cares" USING btree ("pregnancy_id");--> statement-breakpoint
CREATE INDEX "appointment_doctor_id_idx" ON "appointments" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "appointment_patient_id_idx" ON "appointments" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "appointment_date_idx" ON "appointments" USING btree ("date");--> statement-breakpoint
CREATE INDEX "attachment_facility_id_idx" ON "attachments" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "attachment_source_idx" ON "attachments" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "audit_event_actor_user_id_idx" ON "audit_events" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_event_patient_id_idx" ON "audit_events" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "audit_event_created_at_idx" ON "audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "auth_session_user_id_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_session_status_idx" ON "auth_sessions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_session_refresh_token_hash_unique" ON "auth_sessions" USING btree ("refresh_token_hash");--> statement-breakpoint
CREATE INDEX "child_immunization_patient_id_idx" ON "child_immunizations" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "complaint_patient_id_idx" ON "complaints" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "complaint_visit_id_idx" ON "complaints" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "complaint_encounter_id_idx" ON "complaints" USING btree ("encounter_id");--> statement-breakpoint
CREATE INDEX "confirm_diagnosis_patient_id_idx" ON "confirm_diagnoses" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "confirm_diagnosis_visit_id_idx" ON "confirm_diagnoses" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "confirm_diagnosis_encounter_id_idx" ON "confirm_diagnoses" USING btree ("encounter_id");--> statement-breakpoint
CREATE INDEX "consent_patient_id_idx" ON "consents" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "consent_purpose_status_idx" ON "consents" USING btree ("purpose","status");--> statement-breakpoint
CREATE INDEX "delivery_patient_id_idx" ON "deliveries" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "delivery_pregnancy_id_idx" ON "deliveries" USING btree ("pregnancy_id");--> statement-breakpoint
CREATE INDEX "delivery_children_delivery_id_idx" ON "delivery_children" USING btree ("delivery_id");--> statement-breakpoint
CREATE INDEX "delivery_children_patient_id_idx" ON "delivery_children" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "document_patient_id_idx" ON "documents" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "encounter_patient_id_idx" ON "encounters" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "encounter_visit_id_idx" ON "encounters" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "encounter_doctor_id_idx" ON "encounters" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "encounter_facility_id_idx" ON "encounters" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "encounter_at_idx" ON "encounters" USING btree ("encounter_at");--> statement-breakpoint
CREATE UNIQUE INDEX "fpn_family_planning_id_unique" ON "family_planning_news" USING btree ("family_planning_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fpn_previous_device_id_unique" ON "family_planning_news" USING btree ("previous_device_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fpr_family_planning_id_unique" ON "family_planning_removals" USING btree ("family_planning_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fpr_previous_device_id_unique" ON "family_planning_removals" USING btree ("previous_device_id");--> statement-breakpoint
CREATE INDEX "family_planning_patient_id_idx" ON "family_plannings" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "family_planning_facility_id_idx" ON "family_plannings" USING btree ("facility_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fph_new_fp_id_unique" ON "fp_hormonal_details" USING btree ("new_fp_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fpi_new_fp_id_unique" ON "fp_iucd_details" USING btree ("new_fp_id");--> statement-breakpoint
CREATE INDEX "growth_patient_id_idx" ON "growths" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "history_visit_id_idx" ON "histories" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "history_encounter_id_idx" ON "histories" USING btree ("encounter_id");--> statement-breakpoint
CREATE INDEX "home_baby_pnc_patient_id_idx" ON "home_baby_postnatal_cares" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "home_baby_pnc_pregnancy_id_idx" ON "home_baby_postnatal_cares" USING btree ("pregnancy_id");--> statement-breakpoint
CREATE INDEX "home_mother_pnc_patient_id_idx" ON "home_mother_postnatal_cares" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "home_mother_pnc_pregnancy_id_idx" ON "home_mother_postnatal_cares" USING btree ("pregnancy_id");--> statement-breakpoint
CREATE UNIQUE INDEX "icd11_codes_code_uidx" ON "icd11_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "icd11_codes_category_idx" ON "icd11_codes" USING btree ("category");--> statement-breakpoint
CREATE INDEX "immunization_history_patient_id_idx" ON "immunization_histories" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "immunization_history_child_immunization_id_idx" ON "immunization_histories" USING btree ("child_immunization_id");--> statement-breakpoint
CREATE INDEX "medication_patient_id_idx" ON "medications" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "medication_visit_id_idx" ON "medications" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "medication_encounter_id_idx" ON "medications" USING btree ("encounter_id");--> statement-breakpoint
CREATE INDEX "notification_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "patient_identifier_patient_id_idx" ON "patient_identifiers" USING btree ("patient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "patient_identifier_system_value_unique" ON "patient_identifiers" USING btree ("system","value");--> statement-breakpoint
CREATE UNIQUE INDEX "patient_patient_id_unique" ON "patients" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "patient_facility_id_idx" ON "patients" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "patient_person_id_idx" ON "patients" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "person_address_person_id_idx" ON "person_addresses" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "person_contact_person_id_idx" ON "person_contacts" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "person_contact_system_value_idx" ON "person_contacts" USING btree ("system","value");--> statement-breakpoint
CREATE INDEX "person_identifier_person_id_idx" ON "person_identifiers" USING btree ("person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "person_identifier_system_value_unique" ON "person_identifiers" USING btree ("system","value");--> statement-breakpoint
CREATE INDEX "person_name_person_id_idx" ON "person_names" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "person_status_idx" ON "persons" USING btree ("status");--> statement-breakpoint
CREATE INDEX "physical_examination_patient_id_idx" ON "physical_examinations" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "physical_examination_visit_id_idx" ON "physical_examinations" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "physical_examination_encounter_id_idx" ON "physical_examinations" USING btree ("encounter_id");--> statement-breakpoint
CREATE INDEX "postnatal_care_patient_id_idx" ON "postnatal_cares" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "postnatal_care_pregnancy_id_idx" ON "postnatal_cares" USING btree ("pregnancy_id");--> statement-breakpoint
CREATE INDEX "practitioner_role_assignment_practitioner_id_idx" ON "practitioner_role_assignments" USING btree ("practitioner_id");--> statement-breakpoint
CREATE INDEX "practitioner_person_id_idx" ON "practitioners" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "pregnancy_patient_id_idx" ON "pregnancies" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "provisional_diagnosis_patient_id_idx" ON "provisional_diagnoses" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "provisional_diagnosis_visit_id_idx" ON "provisional_diagnoses" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "provisional_diagnosis_encounter_id_idx" ON "provisional_diagnoses" USING btree ("encounter_id");--> statement-breakpoint
CREATE INDEX "roster_user_id_idx" ON "rosters" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "roster_facility_id_idx" ON "rosters" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "roster_date_idx" ON "rosters" USING btree ("date");--> statement-breakpoint
CREATE INDEX "sms_log_patient_id_idx" ON "sms_logs" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "test_visit_id_idx" ON "tests" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "test_encounter_id_idx" ON "tests" USING btree ("encounter_id");--> statement-breakpoint
CREATE INDEX "treatment_patient_id_idx" ON "treatments" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "treatment_visit_id_idx" ON "treatments" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "treatment_encounter_id_idx" ON "treatments" USING btree ("encounter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_profile_user_id_unique" ON "user_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_role_assignment_user_id_idx" ON "user_role_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_role_assignment_role_id_idx" ON "user_role_assignments" USING btree ("role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_role_assignment_unique" ON "user_role_assignments" USING btree ("user_id","role_id","facility_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "user_username_unique" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "user_facility_id_idx" ON "users" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "user_person_id_idx" ON "users" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "visit_patient_id_idx" ON "visits" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "visit_doctor_id_idx" ON "visits" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "visit_facility_id_idx" ON "visits" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "vital_visit_id_idx" ON "vitals" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "vital_encounter_id_idx" ON "vitals" USING btree ("encounter_id");