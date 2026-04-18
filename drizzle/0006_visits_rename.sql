ALTER TYPE "public"."encounter_status_enum" RENAME TO "visit_status_enum";--> statement-breakpoint
ALTER TABLE "encounters" RENAME TO "visits";--> statement-breakpoint
ALTER TABLE "visits" RENAME CONSTRAINT "encounters_patient_id_patients_id_fk" TO "visits_patient_id_patients_id_fk";--> statement-breakpoint
ALTER TABLE "visits" RENAME CONSTRAINT "encounters_facility_id_health_facilities_id_fk" TO "visits_facility_id_health_facilities_id_fk";--> statement-breakpoint
ALTER TABLE "visits" RENAME CONSTRAINT "encounters_doctor_id_users_id_fk" TO "visits_doctor_id_users_id_fk";--> statement-breakpoint
ALTER INDEX "encounter_patient_id_idx" RENAME TO "visit_patient_id_idx";--> statement-breakpoint
ALTER INDEX "encounter_doctor_id_idx" RENAME TO "visit_doctor_id_idx";--> statement-breakpoint
ALTER INDEX "encounter_facility_id_idx" RENAME TO "visit_facility_id_idx";--> statement-breakpoint
ALTER TABLE "vitals" RENAME COLUMN "encounter_id" TO "visit_id";--> statement-breakpoint
ALTER TABLE "vitals" RENAME CONSTRAINT "vitals_encounter_id_encounters_id_fk" TO "vitals_visit_id_visits_id_fk";--> statement-breakpoint
ALTER INDEX "vital_encounter_id_idx" RENAME TO "vital_visit_id_idx";--> statement-breakpoint
ALTER TABLE "histories" RENAME COLUMN "encounter_id" TO "visit_id";--> statement-breakpoint
ALTER TABLE "histories" RENAME CONSTRAINT "histories_encounter_id_encounters_id_fk" TO "histories_visit_id_visits_id_fk";--> statement-breakpoint
ALTER INDEX "history_encounter_id_idx" RENAME TO "history_visit_id_idx";--> statement-breakpoint
ALTER TABLE "complaints" RENAME COLUMN "encounter_id" TO "visit_id";--> statement-breakpoint
ALTER TABLE "complaints" RENAME CONSTRAINT "complaints_encounter_id_encounters_id_fk" TO "complaints_visit_id_visits_id_fk";--> statement-breakpoint
ALTER INDEX "complaint_encounter_id_idx" RENAME TO "complaint_visit_id_idx";--> statement-breakpoint
ALTER TABLE "physical_examinations" RENAME COLUMN "encounter_id" TO "visit_id";--> statement-breakpoint
ALTER TABLE "physical_examinations" RENAME CONSTRAINT "physical_examinations_encounter_id_encounters_id_fk" TO "physical_examinations_visit_id_visits_id_fk";--> statement-breakpoint
ALTER INDEX "physical_examination_encounter_id_idx" RENAME TO "physical_examination_visit_id_idx";--> statement-breakpoint
ALTER TABLE "provisional_diagnoses" RENAME COLUMN "encounter_id" TO "visit_id";--> statement-breakpoint
ALTER TABLE "provisional_diagnoses" RENAME CONSTRAINT "provisional_diagnoses_encounter_id_encounters_id_fk" TO "provisional_diagnoses_visit_id_visits_id_fk";--> statement-breakpoint
ALTER INDEX "provisional_diagnosis_encounter_id_idx" RENAME TO "provisional_diagnosis_visit_id_idx";--> statement-breakpoint
ALTER TABLE "confirm_diagnoses" RENAME COLUMN "encounter_id" TO "visit_id";--> statement-breakpoint
ALTER TABLE "confirm_diagnoses" RENAME CONSTRAINT "confirm_diagnoses_encounter_id_encounters_id_fk" TO "confirm_diagnoses_visit_id_visits_id_fk";--> statement-breakpoint
ALTER INDEX "confirm_diagnosis_encounter_id_idx" RENAME TO "confirm_diagnosis_visit_id_idx";--> statement-breakpoint
ALTER TABLE "tests" RENAME COLUMN "encounter_id" TO "visit_id";--> statement-breakpoint
ALTER TABLE "tests" RENAME CONSTRAINT "tests_encounter_id_encounters_id_fk" TO "tests_visit_id_visits_id_fk";--> statement-breakpoint
ALTER INDEX "test_encounter_id_idx" RENAME TO "test_visit_id_idx";--> statement-breakpoint
ALTER TABLE "treatments" RENAME COLUMN "encounter_id" TO "visit_id";--> statement-breakpoint
ALTER TABLE "treatments" RENAME CONSTRAINT "treatments_encounter_id_encounters_id_fk" TO "treatments_visit_id_visits_id_fk";--> statement-breakpoint
ALTER INDEX "treatment_encounter_id_idx" RENAME TO "treatment_visit_id_idx";--> statement-breakpoint
ALTER TABLE "medications" RENAME COLUMN "encounter_id" TO "visit_id";--> statement-breakpoint
ALTER TABLE "medications" RENAME CONSTRAINT "medications_encounter_id_encounters_id_fk" TO "medications_visit_id_visits_id_fk";--> statement-breakpoint
ALTER INDEX "medication_encounter_id_idx" RENAME TO "medication_visit_id_idx";--> statement-breakpoint
ALTER TABLE "documents" RENAME COLUMN "encounter_id" TO "visit_id";--> statement-breakpoint
ALTER TABLE "documents" RENAME CONSTRAINT "documents_encounter_id_encounters_id_fk" TO "documents_visit_id_visits_id_fk";--> statement-breakpoint
