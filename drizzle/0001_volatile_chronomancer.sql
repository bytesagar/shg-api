CREATE INDEX "attachment_facility_source_created_idx" ON "attachments" USING btree ("facility_id","source_type","created_at");--> statement-breakpoint
CREATE INDEX "child_immunization_facility_patient_idx" ON "child_immunizations" USING btree ("facility_id","patient_id");--> statement-breakpoint
CREATE INDEX "confirm_diagnosis_patient_created_idx" ON "confirm_diagnoses" USING btree ("patient_id","created_at");--> statement-breakpoint
CREATE INDEX "encounter_facility_patient_at_idx" ON "encounters" USING btree ("facility_id","patient_id","encounter_at");--> statement-breakpoint
CREATE INDEX "family_planning_facility_patient_service_date_idx" ON "family_plannings" USING btree ("facility_id","patient_id","service_date");--> statement-breakpoint
CREATE INDEX "health_facility_hf_code_idx" ON "health_facilities" USING btree ("hf_code");--> statement-breakpoint
CREATE INDEX "health_facility_name_idx" ON "health_facilities" USING btree ("name");--> statement-breakpoint
CREATE INDEX "immunization_history_patient_date_idx" ON "immunization_histories" USING btree ("patient_id","date");--> statement-breakpoint
CREATE INDEX "medication_patient_created_idx" ON "medications" USING btree ("patient_id","created_at");--> statement-breakpoint
CREATE INDEX "person_contact_primary_idx" ON "person_contacts" USING btree ("person_id","system","is_primary");--> statement-breakpoint
CREATE INDEX "person_name_primary_idx" ON "person_names" USING btree ("person_id","is_primary");--> statement-breakpoint
CREATE INDEX "postnatal_care_patient_visit_date_idx" ON "postnatal_cares" USING btree ("patient_id","visit_date");--> statement-breakpoint
CREATE INDEX "practitioner_role_assignment_facility_id_idx" ON "practitioner_role_assignments" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "practitioner_role_assignment_role_active_idx" ON "practitioner_role_assignments" USING btree ("role_code","active");--> statement-breakpoint
CREATE INDEX "pregnancy_facility_patient_first_visit_idx" ON "pregnancies" USING btree ("facility_id","patient_id","first_visit");--> statement-breakpoint
CREATE INDEX "provisional_diagnosis_patient_created_idx" ON "provisional_diagnoses" USING btree ("patient_id","created_at");--> statement-breakpoint
CREATE INDEX "test_encounter_created_idx" ON "tests" USING btree ("encounter_id","created_at");--> statement-breakpoint
CREATE INDEX "vital_encounter_created_idx" ON "vitals" USING btree ("encounter_id","created_at");