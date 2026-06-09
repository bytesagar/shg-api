import {
  pgTable,
  varchar,
  integer,
  date,
  timestamp,
  text,
  boolean,
  real,
  uniqueIndex,
  index,
  uuid,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  abortionProcedureEnum,
  ancProtocolVisitEnum,
  birthAttendantEnum,
  complicationManagementEnum,
  complicationStageEnum,
  deliveryModeEnum,
  deliveryPlaceEnum,
  familyPlanningPostpartumTypeEnum,
  fetalPresentationEnum,
  genderEnum,
  hmisEthnicCodeEnum,
  laborTypeEnum,
  maternalDeathStageEnum,
  maternalOutcomeEnum,
  neonatalStatusEnum,
  pacIndicationEnum,
  pncProtocolVisitEnum,
  pregnancyStatusEnum,
  testResultEnum,
} from "./enums";
import {
  users,
} from "./auth";
import {
  encounters,
  visits,
} from "./clinical";
import {
  health_facilities,
} from "./facilities";
import {
  patients,
} from "./patient";

export const pregnancies = pgTable(
  "pregnancies",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    firstVisit: date("first_visit", { mode: "string" }).notNull(),
    gravida: varchar("gravida", { length: 50 }).notNull(),
    para: varchar("para", { length: 50 }),
    lastMenstruationPeriod: date("last_menstruation_period", {
      mode: "string",
    }),
    expectedDeliveryDate: date("expected_delivery_date", { mode: "string" }),
    status: pregnancyStatusEnum("status").default("active").notNull(),
    endedAt: timestamp("ended_at"),
    visitId: uuid("visit_id").references(() => visits.id),
    encounterId: uuid("encounter_id").references(() => encounters.id),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    facilityId: uuid("facility_id").references(() => health_facilities.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
    assignedFchvId: uuid("assigned_fchv_id").references(() => users.id),

    // ---- HMIS 2082 extensions ----
    // Ethnicity snapshot so historical aggregates stay stable.
    hmisEthnicCode: hmisEthnicCodeEnum("hmis_ethnic_code"),

    // Structured obstetric history (free-text gravida/para kept above).
    gravidaNum: integer("gravida_num"),
    paraNum: integer("para_num"),
    abortionsNum: integer("abortions_num"),
    livingChildrenNum: integer("living_children_num"),

    // One-time screenings during pregnancy.
    rousgFirstDate: date("rousg_first_date", { mode: "string" }),
    hivTestDate: date("hiv_test_date", { mode: "string" }),
    hivResult: testResultEnum("hiv_result"),
    hivTreatmentOrReferral: text("hiv_treatment_or_referral"),
    hbsagTestDate: date("hbsag_test_date", { mode: "string" }),
    hbsagResult: testResultEnum("hbsag_result"),
    hbsagTreatmentOrReferral: text("hbsag_treatment_or_referral"),
    syphilisTreponemalDate: date("syphilis_treponemal_date", { mode: "string" }),
    syphilisTreponemalResult: testResultEnum("syphilis_treponemal_result"),
    syphilisNontreponemalDate: date("syphilis_nontreponemal_date", {
      mode: "string",
    }),
    syphilisNontreponemalResult: testResultEnum("syphilis_nontreponemal_result"),
    syphilisTreatmentOrReferral: text("syphilis_treatment_or_referral"),
    tbSputumTestDate: date("tb_sputum_test_date", { mode: "string" }),
    dewormingDate: date("deworming_date", { mode: "string" }),

    // TD vaccine doses.
    td1Date: date("td1_date", { mode: "string" }),
    td2Date: date("td2_date", { mode: "string" }),
    td2plusDate: date("td2plus_date", { mode: "string" }),

    // Aama ANC encouragement (NPR 800 if 4-visit protocol completed).
    ancIncentiveEligible: boolean("anc_incentive_eligible"),
    ancIncentiveReceived: boolean("anc_incentive_received"),
    ancIncentiveAmount: integer("anc_incentive_amount"),
    ancIncentiveReasonIfNot: text("anc_incentive_reason_if_not"),
    ancIncentivePaidAt: date("anc_incentive_paid_at", { mode: "string" }),

    // Flips true when schema-completeness checks pass (drives HMIS analytics).
    hmisCompliant: boolean("hmis_compliant").default(false).notNull(),
  },
  (t) => [
    index("pregnancy_patient_id_idx").on(t.patientId),
    index("pregnancy_visit_id_idx").on(t.visitId),
    index("pregnancy_encounter_id_idx").on(t.encounterId),
    index("pregnancy_facility_patient_first_visit_idx").on(
      t.facilityId,
      t.patientId,
      t.firstVisit,
    ),
  ],
);

export const antenatal_cares = pgTable(
  "antenatal_cares",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    ancVisitDate: date("anc_visit_date", { mode: "string" }),
    visitingTimeWeek: varchar("visiting_time_week", { length: 50 }),
    visitingTimeMonth: varchar("visiting_time_month", { length: 50 }),
    motherWeight: real("mother_weight"),
    anemia: integer("anemia"),
    edema: integer("edema"),
    systolic: integer("systolic"),
    diastolic: integer("diastolic"),
    pregnancyPeriodWeek: varchar("pregnancy_period_week", { length: 50 }),
    fundalHeight: real("fundal_height"),
    babyPresentation: varchar("baby_presentation", { length: 255 }),
    heartRate: integer("heart_rate"),
    otherProblems: text("other_problems"),
    treatment: text("treatment"),
    medicalAdvice: text("medical_advice"),
    nextVisitSchedule: date("next_visit_schedule", { mode: "string" }),
    ironTablet: integer("iron_tablet"),
    albendazole: integer("albendazole"),
    tdVaccination: varchar("td_vaccination", { length: 255 }),
    obstructiveComplications: text("obstructive_complications"),
    obstructiveComplicationsOther: text("obstructive_complications_other"),
    dangerSign: text("danger_sign"),
    dangerSignOther: text("danger_sign_other"),
    visitId: uuid("visit_id").references(() => visits.id),
    encounterId: uuid("encounter_id").references(() => encounters.id),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    pregnancyId: uuid("pregnancy_id")
      .notNull()
      .references(() => pregnancies.id),
    documentUrl: varchar("document_url", { length: 500 }),
    doctorFeedback: text("doctor_feedback"),
    refer: varchar("refer", { length: 255 }),
    referReason: text("refer_reason"),
    calcium: integer("calcium"),
    folicAcid: integer("folic_acid"),
    investigation: text("investigation"),
    serviceProvidedBy: uuid("service_provided_by").references(() => users.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),

    // ---- HMIS 2082 extensions ----
    protocolVisitNumber: ancProtocolVisitEnum("protocol_visit_number"),
    protocolWindowViolation: boolean("protocol_window_violation")
      .default(false)
      .notNull(),
    gestationalAgeWeeks: integer("gestational_age_weeks"),
    anaemiaPresent: boolean("anaemia_present"),
    edemaLocation: varchar("edema_location", { length: 20 }),
    motherHeightCm: real("mother_height_cm"),
    bmi: real("bmi"),
  },
  (t) => [
    index("antenatal_care_patient_id_idx").on(t.patientId),
    index("antenatal_care_pregnancy_id_idx").on(t.pregnancyId),
    index("antenatal_care_visit_id_idx").on(t.visitId),
    index("antenatal_care_encounter_id_idx").on(t.encounterId),
    index("antenatal_care_protocol_visit_idx").on(
      t.pregnancyId,
      t.protocolVisitNumber,
    ),
  ],
);

export const deliveries = pgTable(
  "deliveries",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    deliveryDate: date("delivery_date", { mode: "string" }),
    placeOfDelivery: varchar("place_of_delivery", { length: 255 }),
    otherPlaceOfDelivery: varchar("other_place_of_delivery", {
      length: 255,
    }),
    babyPresentation: varchar("baby_presentation", { length: 255 }),
    typeOfDelivery: varchar("type_of_delivery", { length: 255 }),
    noOfLiveMaleBaby: integer("no_of_live_male_baby"),
    noOfLiveFemaleBaby: integer("no_of_live_female_baby"),
    noOfStillMaleBaby: integer("no_of_still_male_baby"),
    noOfStillFemaleBaby: integer("no_of_still_female_baby"),
    noOfFreshStillBirth: integer("no_of_fresh_still_birth"),
    noOfMaceratedStillBirth: integer("no_of_macerated_still_birth"),
    deliveryAttendedBy: varchar("delivery_attended_by", { length: 255 }),
    otherProblems: text("other_problems"),
    treatment: text("treatment"),
    investigation: text("investigation"),
    doctorFeedback: text("doctor_feedback"),
    refer: varchar("refer", { length: 255 }),
    referReason: text("refer_reason"),
    vitaminK: integer("vitamin_k"),
    umbilicalCream: integer("umbilical_cream"),
    visitId: uuid("visit_id").references(() => visits.id),
    encounterId: uuid("encounter_id").references(() => encounters.id),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    pregnancyId: uuid("pregnancy_id")
      .notNull()
      .references(() => pregnancies.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),

    // ---- HMIS 2082 extensions ----
    admissionAt: timestamp("admission_at"),
    deliveryAt: timestamp("delivery_at"),
    dischargeAt: timestamp("discharge_at"),
    laborType: laborTypeEnum("labor_type"),
    fetalPresentation: fetalPresentationEnum("fetal_presentation"),
    deliveryMode: deliveryModeEnum("delivery_mode"),
    placeCode: deliveryPlaceEnum("place_code"),
    otherFacilityName: varchar("other_facility_name", { length: 255 }),
    birthAttendant: birthAttendantEnum("birth_attendant"),

    noOfLiveTermBabies: integer("no_of_live_term_babies"),
    noOfLivePretermBabies: integer("no_of_live_preterm_babies"),
    noOfStillIntrapartum: integer("no_of_still_intrapartum"),
    noOfStillAntepartum: integer("no_of_still_antepartum"),

    oxytocinGiven: boolean("oxytocin_given"),
    kmcGiven: boolean("kmc_given"),
    earlyBreastfeedingWithin1h: boolean("early_breastfeeding_within_1h"),
    antiDGiven: boolean("anti_d_given"),
    warmBagDistributed: boolean("warm_bag_distributed"),
    warmBagReasonIfNot: text("warm_bag_reason_if_not"),
    bloodTransfusionPints: integer("blood_transfusion_pints").default(0),
    cabinUsed: boolean("cabin_used"),

    maternalOutcome: maternalOutcomeEnum("maternal_outcome"),
    referredToFacilityId: uuid("referred_to_facility_id").references(
      () => health_facilities.id,
    ),

    transportIncentiveEligible: boolean("transport_incentive_eligible"),
    transportIncentiveReceived: boolean("transport_incentive_received"),
    transportIncentiveAmount: integer("transport_incentive_amount"),
    transportIncentiveReasonIfNot: text("transport_incentive_reason_if_not"),
  },
  (t) => [
    index("delivery_patient_id_idx").on(t.patientId),
    index("delivery_pregnancy_id_idx").on(t.pregnancyId),
    index("delivery_visit_id_idx").on(t.visitId),
    index("delivery_encounter_id_idx").on(t.encounterId),
    index("delivery_mode_idx").on(t.deliveryMode),
    index("delivery_place_idx").on(t.placeCode),
  ],
);

export const delivery_children = pgTable(
  "delivery_children",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    deliveryId: uuid("delivery_id")
      .notNull()
      .references(() => deliveries.id),
    weightOfBaby: real("weight_of_baby"),
    newBornBabyStatus: varchar("new_born_baby_status", { length: 255 }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    pregnancyId: uuid("pregnancy_id")
      .notNull()
      .references(() => pregnancies.id),
    apgarScore1: integer("apgar_score_1"),
    apgarScore2: integer("apgar_score_2"),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),

    // ---- HMIS 2082 extensions ----
    sex: genderEnum("sex"),
    neonatalStatus: neonatalStatusEnum("neonatal_status"),
    isTerm: boolean("is_term"),
    congenitalAnomalyMajor: boolean("congenital_anomaly_major"),
    congenitalAnomalyMinor: boolean("congenital_anomaly_minor"),
    congenitalAnomalyOtherCount: integer("congenital_anomaly_other_count"),
    congenitalAnomalyIcdCode: varchar("congenital_anomaly_icd_code", {
      length: 50,
    }),
  },
  (t) => [
    index("delivery_children_delivery_id_idx").on(t.deliveryId),
    index("delivery_children_patient_id_idx").on(t.patientId),
  ],
);

export const postnatal_cares = pgTable(
  "postnatal_cares",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    visitingTime: varchar("visiting_time", { length: 100 }).notNull(),
    visitTime: varchar("visit_time", { length: 100 }).notNull(),
    visitDate: date("visit_date", { mode: "string" }).notNull(),
    conditionOfMother: text("condition_of_mother").notNull(),
    conditionOfBaby: text("condition_of_baby").notNull(),
    medicalAdvice: text("medical_advice").notNull(),
    familyPlanningServices: text("family_planning_services").notNull(),
    complications: text("complications").notNull(),
    dangerSignsOnMother: text("danger_signs_on_mother").notNull(),
    dangerSignsOnBaby: text("danger_signs_on_baby").notNull(),
    checkupAttendedBy: varchar("checkup_attended_by", {
      length: 255,
    }).notNull(),
    newBornBabyStatus: varchar("new_born_baby_status", {
      length: 255,
    }).notNull(),
    refer: varchar("refer", { length: 255 }),
    referReason: text("refer_reason"),
    otherProblems: text("other_problems"),
    treatment: text("treatment").notNull(),
    investigation: text("investigation"),
    doctorFeedback: text("doctor_feedback"),
    ironTablet: integer("iron_tablet"),
    calcium: integer("calcium"),
    visitId: uuid("visit_id").references(() => visits.id),
    encounterId: uuid("encounter_id").references(() => encounters.id),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    pregnancyId: uuid("pregnancy_id")
      .notNull()
      .references(() => pregnancies.id),
    serviceProvidedBy: uuid("service_provided_by").references(() => users.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),

    // ---- HMIS 2082 extensions ----
    protocolVisitNumber: pncProtocolVisitEnum("protocol_visit_number"),
    locationCode: varchar("location_code", { length: 20 }), // facility | home
    familyPlanningServiceType: familyPlanningPostpartumTypeEnum(
      "family_planning_service_type",
    ),
    fpGivenWithin48h: boolean("fp_given_within_48h"),
    fpGivenWithin42d: boolean("fp_given_within_42d"),
    vitaminKDate: date("vitamin_k_date", { mode: "string" }),
    postnatalBloodTransfusionPints: integer(
      "postnatal_blood_transfusion_pints",
    ).default(0),
  },
  (t) => [
    index("postnatal_care_patient_id_idx").on(t.patientId),
    index("postnatal_care_pregnancy_id_idx").on(t.pregnancyId),
    index("postnatal_care_patient_visit_date_idx").on(t.patientId, t.visitDate),
    index("postnatal_care_visit_id_idx").on(t.visitId),
    index("postnatal_care_encounter_id_idx").on(t.encounterId),
    index("postnatal_care_protocol_visit_idx").on(
      t.pregnancyId,
      t.protocolVisitNumber,
    ),
  ],
);

export const home_mother_postnatal_cares = pgTable(
  "home_mother_postnatal_cares",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    visitingTime: varchar("visiting_time", { length: 100 }).notNull(),
    visitTime: varchar("visit_time", { length: 100 }).notNull(),
    visitDate: timestamp("visit_date").notNull(),
    pulse: real("pulse").notNull(),
    bodyTemperature: real("body_temperature").notNull(),
    bpSystolic: integer("bp_systolic").notNull(),
    bpDiastolic: integer("bp_diastolic").notNull(),
    ppHaemorage: text("pp_haemorage").notNull(),
    ppHaemorageTreatment: text("pp_haemorage_treatment").notNull(),
    breastExamination: text("breast_examination").notNull(),
    edema: text("edema").notNull(),
    examinationOfUterus: text("examination_of_uterus").notNull(),
    vaginalExamination: text("vaginal_examination").notNull(),
    urinationDifficulties: text("urination_difficulties").notNull(),
    vaginalDischarge: text("vaginal_discharge"),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    pregnancyId: uuid("pregnancy_id")
      .notNull()
      .references(() => pregnancies.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("home_mother_pnc_patient_id_idx").on(t.patientId),
    index("home_mother_pnc_pregnancy_id_idx").on(t.pregnancyId),
  ],
);

export const home_baby_postnatal_cares = pgTable(
  "home_baby_postnatal_cares",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    visitingTime: varchar("visiting_time", { length: 100 }).notNull(),
    visitTime: varchar("visit_time", { length: 100 }).notNull(),
    visitDate: timestamp("visit_date").notNull(),
    activities: text("activities").notNull(),
    respiration: integer("respiration").notNull(),
    temperature: real("temperature").notNull(),
    umbilicalArea: text("umbilical_area").notNull(),
    skin: text("skin").notNull(),
    eye: text("eye").notNull(),
    jaundice: text("jaundice").notNull(),
    breastFeeding: text("breast_feeding").notNull(),
    stool: text("stool").notNull(),
    urination: text("urination").notNull(),
    umbilicalCream: text("umbilical_cream"),
    healthCareProvider: varchar("health_care_provider", {
      length: 255,
    }).notNull(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    pregnancyId: uuid("pregnancy_id")
      .notNull()
      .references(() => pregnancies.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("home_baby_pnc_patient_id_idx").on(t.patientId),
    index("home_baby_pnc_pregnancy_id_idx").on(t.pregnancyId),
  ],
);

// ============================================================
// HMIS 2082 — STRUCTURED COMPLICATIONS, HISTORY, DEATHS, AAMA
// ============================================================

export const pregnancy_complications = pgTable(
  "pregnancy_complications",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    pregnancyId: uuid("pregnancy_id")
      .notNull()
      .references(() => pregnancies.id),
    stage: complicationStageEnum("stage").notNull(),
    icd11Code: varchar("icd11_code", { length: 50 }),
    icd11Title: text("icd11_title"),
    management: complicationManagementEnum("management"),
    referredToFacilityId: uuid("referred_to_facility_id").references(
      () => health_facilities.id,
    ),
    notes: text("notes"),
    recordedAt: timestamp("recorded_at").defaultNow().notNull(),
    recordedAtAncId: uuid("recorded_at_anc_id").references(
      () => antenatal_cares.id,
    ),
    recordedAtDeliveryId: uuid("recorded_at_delivery_id").references(
      () => deliveries.id,
    ),
    recordedAtPncId: uuid("recorded_at_pnc_id").references(
      () => postnatal_cares.id,
    ),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => health_facilities.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("pregnancy_complication_pregnancy_idx").on(t.pregnancyId),
    index("pregnancy_complication_stage_icd_idx").on(t.stage, t.icd11Code),
    index("pregnancy_complication_facility_recorded_at_idx").on(
      t.facilityId,
      t.recordedAt,
    ),
  ],
);

export const previous_pregnancies = pgTable(
  "previous_pregnancies",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    pregnancyId: uuid("pregnancy_id")
      .notNull()
      .references(() => pregnancies.id),
    ordinal: integer("ordinal").notNull(),
    year: integer("year"),
    outcome: varchar("outcome", { length: 40 }),
    deliveryMode: deliveryModeEnum("delivery_mode"),
    complicationIcd11Code: varchar("complication_icd11_code", { length: 50 }),
    liveBirth: boolean("live_birth"),
    stillBirth: boolean("still_birth"),
    preterm: boolean("preterm"),
    twin: boolean("twin"),
    abortion: boolean("abortion"),
    tdDoseReceived: boolean("td_dose_received"),
    childSex: genderEnum("child_sex"),
    childCurrentAgeMonths: integer("child_current_age_months"),
    notes: text("notes"),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => health_facilities.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("previous_pregnancy_pregnancy_idx").on(t.pregnancyId),
  ],
);

export const maternal_deaths = pgTable(
  "maternal_deaths",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    pregnancyId: uuid("pregnancy_id").references(() => pregnancies.id),
    deathDate: date("death_date", { mode: "string" }).notNull(),
    place: varchar("place", { length: 30 }), // home | facility | other
    placeDetail: text("place_detail"),
    stage: maternalDeathStageEnum("stage").notNull(),
    causeIcd11Code: varchar("cause_icd11_code", { length: 50 }),
    causeText: text("cause_text"),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => health_facilities.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("maternal_death_patient_idx").on(t.patientId),
    index("maternal_death_facility_date_idx").on(t.facilityId, t.deathDate),
  ],
);

export const newborn_deaths = pgTable(
  "newborn_deaths",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    deliveryId: uuid("delivery_id").references(() => deliveries.id),
    deliveryChildId: uuid("delivery_child_id").references(
      () => delivery_children.id,
    ),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    deathDate: date("death_date", { mode: "string" }).notNull(),
    ageAtDeathHours: integer("age_at_death_hours"),
    causeIcd11Code: varchar("cause_icd11_code", { length: 50 }),
    causeText: text("cause_text"),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => health_facilities.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("newborn_death_facility_date_idx").on(t.facilityId, t.deathDate),
    index("newborn_death_patient_idx").on(t.patientId),
  ],
);

export const safe_abortions = pgTable(
  "safe_abortions",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    procedureDate: date("procedure_date", { mode: "string" }).notNull(),
    hmisEthnicCode: hmisEthnicCodeEnum("hmis_ethnic_code"),
    age: integer("age"),
    education: varchar("education", { length: 50 }),
    gravidaNum: integer("gravida_num"),
    livingChildrenNum: integer("living_children_num"),
    gestationByLmpWeeks: integer("gestation_by_lmp_weeks"),
    gestationByExamWeeks: integer("gestation_by_exam_weeks"),
    procedure: abortionProcedureEnum("procedure").notNull(),
    painManagementGiven: boolean("pain_management_given"),
    visitId: uuid("visit_id").references(() => visits.id),
    encounterId: uuid("encounter_id").references(() => encounters.id),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => health_facilities.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("safe_abortion_patient_idx").on(t.patientId),
    index("safe_abortion_facility_date_idx").on(t.facilityId, t.procedureDate),
  ],
);

export const safe_abortion_complications = pgTable(
  "safe_abortion_complications",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    safeAbortionId: uuid("safe_abortion_id")
      .notNull()
      .references(() => safe_abortions.id),
    icd11Code: varchar("icd11_code", { length: 50 }),
    icd11Title: text("icd11_title"),
    complicationKind: varchar("complication_kind", { length: 60 }),
    // incomplete_repeat | heavy_bleeding | uterine_injury | infection
    // | ongoing_pregnancy | ectopic | other
    management: complicationManagementEnum("management"),
    notes: text("notes"),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => health_facilities.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("safe_abortion_complication_abortion_idx").on(t.safeAbortionId),
  ],
);

export const post_abortion_cares = pgTable(
  "post_abortion_cares",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    safeAbortionId: uuid("safe_abortion_id").references(() => safe_abortions.id),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    indication: pacIndicationEnum("indication").notNull(),
    careDate: date("care_date", { mode: "string" }).notNull(),
    fpServiceProvided: varchar("fp_service_provided", { length: 40 }),
    notes: text("notes"),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => health_facilities.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("pac_facility_date_idx").on(t.facilityId, t.careDate),
    index("pac_patient_idx").on(t.patientId),
  ],
);

export const aama_monthly_aggregates = pgTable(
  "aama_monthly_aggregates",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => health_facilities.id),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    hmisEthnicCode: hmisEthnicCodeEnum("hmis_ethnic_code"),

    ancIncentiveEligibleCount: integer("anc_incentive_eligible_count")
      .default(0)
      .notNull(),
    ancIncentivePaidCount: integer("anc_incentive_paid_count")
      .default(0)
      .notNull(),
    transportEligibleCount: integer("transport_eligible_count")
      .default(0)
      .notNull(),
    transportPaidCount: integer("transport_paid_count").default(0).notNull(),

    deliveriesSpontaneous: integer("deliveries_spontaneous").default(0).notNull(),
    deliveriesVacuum: integer("deliveries_vacuum").default(0).notNull(),
    deliveriesForceps: integer("deliveries_forceps").default(0).notNull(),
    deliveriesCs: integer("deliveries_cs").default(0).notNull(),
    deliveriesTotal: integer("deliveries_total").default(0).notNull(),

    breechCount: integer("breech_count").default(0).notNull(),
    shoulderCount: integer("shoulder_count").default(0).notNull(),
    multiplePregnancyCount: integer("multiple_pregnancy_count")
      .default(0)
      .notNull(),
    referredIn: integer("referred_in").default(0).notNull(),
    referredOut: integer("referred_out").default(0).notNull(),
    complicationsManaged: integer("complications_managed").default(0).notNull(),
    antiDGiven: integer("anti_d_given").default(0).notNull(),
    bloodPintsTotal: integer("blood_pints_total").default(0).notNull(),
    cabinUsageCount: integer("cabin_usage_count").default(0).notNull(),

    computedAt: timestamp("computed_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("aama_monthly_unique").on(
      t.facilityId,
      t.year,
      t.month,
      t.hmisEthnicCode,
    ),
  ],
);

// ============================================================
// CHILD IMMUNIZATION
// ============================================================

// HMIS 2082 vaccine catalog — seeded with the Nepal EPI schedule.
// `code` is the stable join key (e.g. 'BCG', 'PENTA', 'OPV', 'PCV', 'ROTA',
// 'FIPV', 'MR', 'JE', 'TCV', 'HPV', 'TD', 'VITA_A', 'DEWORM', 'BAALVITA').
export const pregnanciesRelations = relations(pregnancies, ({ one, many }) => ({
  patient: one(patients, {
    fields: [pregnancies.patientId],
    references: [patients.id],
  }),
  visit: one(visits, {
    fields: [pregnancies.visitId],
    references: [visits.id],
  }),
  encounter: one(encounters, {
    fields: [pregnancies.encounterId],
    references: [encounters.id],
  }),
  facility: one(health_facilities, {
    fields: [pregnancies.facilityId],
    references: [health_facilities.id],
  }),
  fchv: one(users, {
    fields: [pregnancies.assignedFchvId],
    references: [users.id],
    relationName: "assignedFchv",
  }),
  creator: one(users, {
    fields: [pregnancies.createdBy],
    references: [users.id],
    relationName: "pregnancyCreator",
  }),
  updater: one(users, {
    fields: [pregnancies.updatedBy],
    references: [users.id],
    relationName: "pregnancyUpdater",
  }),
  antenatalCares: many(antenatal_cares),
  deliveries: many(deliveries),
  postnatalCares: many(postnatal_cares),
  homeMotherPnc: many(home_mother_postnatal_cares),
  homeBabyPnc: many(home_baby_postnatal_cares),
}));

export const antenatalCaresRelations = relations(antenatal_cares, ({ one }) => ({
  patient: one(patients, {
    fields: [antenatal_cares.patientId],
    references: [patients.id],
  }),
  pregnancy: one(pregnancies, {
    fields: [antenatal_cares.pregnancyId],
    references: [pregnancies.id],
  }),
  visit: one(visits, {
    fields: [antenatal_cares.visitId],
    references: [visits.id],
  }),
  encounter: one(encounters, {
    fields: [antenatal_cares.encounterId],
    references: [encounters.id],
  }),
}));
