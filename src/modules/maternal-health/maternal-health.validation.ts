import { z } from "zod";
import { createListQuerySchema } from "../../utils/query-parser";
import {
  isoDateString,
  optionalIsoDateString,
} from "../../validations/common.validation";

// ---- HMIS 2082 enum unions (mirror src/db/schema.ts) ----

export const hmisEthnicCodeEnum = z.enum([
  "01_dalit",
  "02_janajati",
  "03_madhesi",
  "04_muslim",
  "05_brahmin_chhetri",
  "06_other",
]);

export const ecologicalZoneEnum = z.enum(["mountain", "hill", "terai"]);

export const ancProtocolVisitEnum = z.enum([
  "ANC1",
  "ANC2",
  "ANC3",
  "ANC4",
  "ANC5",
  "ANC6",
  "ANC7",
  "ANC8",
]);

export const pncProtocolVisitEnum = z.enum(["PNC1", "PNC2", "PNC3", "PNC4"]);

export const laborTypeEnum = z.enum(["spontaneous", "augmented", "induced"]);

export const deliveryModeEnum = z.enum([
  "spontaneous",
  "vacuum",
  "forceps",
  "cs",
]);

export const fetalPresentationEnum = z.enum([
  "cephalic",
  "breech",
  "shoulder",
]);

export const birthAttendantEnum = z.enum(["sba_anm", "shp", "other"]);

export const neonatalStatusEnum = z.enum([
  "normal",
  "infection",
  "asphyxia",
  "hypothermia",
  "jaundice",
  "congenital_syphilis",
]);

export const maternalOutcomeEnum = z.enum([
  "recovered",
  "stable",
  "referred",
  "lama",
  "absconded",
  "died",
]);

export const testResultEnum = z.enum([
  "reactive",
  "non_reactive",
  "positive",
  "negative",
  "pending",
]);

export const complicationStageEnum = z.enum([
  "anc",
  "delivery",
  "pnc",
  "abortion",
]);

export const complicationManagementEnum = z.enum(["treated", "referred"]);

export const abortionProcedureEnum = z.enum([
  "mva",
  "eva",
  "medication",
  "manual_induction",
  "d_and_e",
  "misoprostol",
]);

export const pacIndicationEnum = z.enum([
  "incomplete_induced",
  "incomplete_spontaneous",
  "septic",
  "other",
]);

export const maternalDeathStageEnum = z.enum([
  "pregnant",
  "delivery",
  "postnatal_42d",
]);

export const deliveryPlaceEnum = z.enum([
  "home",
  "this_facility",
  "other_facility",
  "enroute",
]);

export const familyPlanningPostpartumTypeEnum = z.enum([
  "iucd",
  "implant",
  "btl",
  "depo",
  "none",
]);

// ---- Pregnancy ----

export const pregnancyCreateSchema = z.object({
  firstVisit: optionalIsoDateString,
  gravida: z.number().min(1).max(50),
  para: z.number().max(50).optional().nullable(),
  lastMenstruationPeriod: optionalIsoDateString,
  expectedDeliveryDate: optionalIsoDateString,
  assignedFchvId: z.uuid().optional().nullable(),

  // HMIS 2082 optional extensions
  hmisEthnicCode: hmisEthnicCodeEnum.optional().nullable(),
  gravidaNum: z.number().int().min(0).optional().nullable(),
  paraNum: z.number().int().min(0).optional().nullable(),
  abortionsNum: z.number().int().min(0).optional().nullable(),
  livingChildrenNum: z.number().int().min(0).optional().nullable(),
});

export type PregnancyCreateInput = z.infer<typeof pregnancyCreateSchema>;

export const pregnanciesListQuerySchema = createListQuerySchema({
  patientId: z.uuid().optional(),
});

export type PregnanciesListQuery = z.infer<typeof pregnanciesListQuerySchema>;

// ---- ANC ----

export const antenatalCareCreateSchema = z.object({
  visitId: z.uuid(),
  ancVisitDate: optionalIsoDateString,
  visitingTimeWeek: z.string().max(50).optional().nullable(),
  visitingTimeMonth: z.string().max(50).optional().nullable(),
  motherWeight: z.number().optional().nullable(),
  anemia: z.number().int().optional().nullable(),
  edema: z.number().int().optional().nullable(),
  systolic: z.number().int().optional().nullable(),
  diastolic: z.number().int().optional().nullable(),
  pregnancyPeriodWeek: z.string().max(50).optional().nullable(),
  fundalHeight: z.number().optional().nullable(),
  babyPresentation: z.string().max(255).optional().nullable(),
  heartRate: z.number().int().optional().nullable(),
  otherProblems: z.string().optional().nullable(),
  treatment: z.string().optional().nullable(),
  medicalAdvice: z.string().optional().nullable(),
  nextVisitSchedule: optionalIsoDateString,
  ironTablet: z.number().int().optional().nullable(),
  albendazole: z.number().int().optional().nullable(),
  tdVaccination: z.string().max(255).optional().nullable(),
  obstructiveComplications: z.string().optional().nullable(),
  obstructiveComplicationsOther: z.string().optional().nullable(),
  dangerSign: z.string().optional().nullable(),
  dangerSignOther: z.string().optional().nullable(),
  documentUrl: z.string().max(500).optional().nullable(),
  doctorFeedback: z.string().optional().nullable(),
  refer: z.string().max(255).optional().nullable(),
  referReason: z.string().optional().nullable(),
  calcium: z.number().int().optional().nullable(),
  folicAcid: z.number().int().optional().nullable(),
  investigation: z.string().optional().nullable(),
  serviceProvidedBy: z.uuid().optional().nullable(),

  // HMIS 2082 optional extensions (server derives protocolVisitNumber and
  // gestationalAgeWeeks; clients may suggest protocolVisitNumber and the
  // server will flag mismatches via protocolWindowViolation).
  protocolVisitNumber: ancProtocolVisitEnum.optional().nullable(),
  anaemiaPresent: z.boolean().optional().nullable(),
  edemaLocation: z
    .enum(["none", "hand", "face", "both"])
    .optional()
    .nullable(),
  motherHeightCm: z.number().positive().optional().nullable(),
  bmi: z.number().positive().optional().nullable(),
});

export type AntenatalCareCreateInput = z.infer<
  typeof antenatalCareCreateSchema
>;

export const antenatalCaresListQuerySchema = createListQuerySchema({
  patientId: z.uuid().optional(),
  pregnancyId: z.uuid().optional(),
});

export type AntenatalCaresListQuery = z.infer<
  typeof antenatalCaresListQuerySchema
>;

// ---- Delivery ----

export const deliveryCreateSchema = z.object({
  visitId: z.uuid(),
  deliveryDate: optionalIsoDateString,
  placeOfDelivery: z.string().max(255).optional().nullable(),
  otherPlaceOfDelivery: z.string().max(255).optional().nullable(),
  babyPresentation: z.string().max(255).optional().nullable(),
  typeOfDelivery: z.string().max(255).optional().nullable(),
  noOfLiveMaleBaby: z.number().int().optional().nullable(),
  noOfLiveFemaleBaby: z.number().int().optional().nullable(),
  noOfStillMaleBaby: z.number().int().optional().nullable(),
  noOfStillFemaleBaby: z.number().int().optional().nullable(),
  noOfFreshStillBirth: z.number().int().optional().nullable(),
  noOfMaceratedStillBirth: z.number().int().optional().nullable(),
  deliveryAttendedBy: z.string().max(255).optional().nullable(),
  otherProblems: z.string().optional().nullable(),
  treatment: z.string().optional().nullable(),
  investigation: z.string().optional().nullable(),
  doctorFeedback: z.string().optional().nullable(),
  refer: z.string().max(255).optional().nullable(),
  referReason: z.string().optional().nullable(),
  vitaminK: z.number().int().optional().nullable(),
  umbilicalCream: z.number().int().optional().nullable(),

  // HMIS 2082 optional extensions
  admissionAt: z.iso.datetime().optional().nullable(),
  deliveryAt: z.iso.datetime().optional().nullable(),
  dischargeAt: z.iso.datetime().optional().nullable(),
  laborType: laborTypeEnum.optional().nullable(),
  fetalPresentation: fetalPresentationEnum.optional().nullable(),
  deliveryMode: deliveryModeEnum.optional().nullable(),
  placeCode: deliveryPlaceEnum.optional().nullable(),
  otherFacilityName: z.string().max(255).optional().nullable(),
  birthAttendant: birthAttendantEnum.optional().nullable(),
  noOfLiveTermBabies: z.number().int().min(0).optional().nullable(),
  noOfLivePretermBabies: z.number().int().min(0).optional().nullable(),
  noOfStillIntrapartum: z.number().int().min(0).optional().nullable(),
  noOfStillAntepartum: z.number().int().min(0).optional().nullable(),
  oxytocinGiven: z.boolean().optional().nullable(),
  kmcGiven: z.boolean().optional().nullable(),
  earlyBreastfeedingWithin1h: z.boolean().optional().nullable(),
  antiDGiven: z.boolean().optional().nullable(),
  warmBagDistributed: z.boolean().optional().nullable(),
  warmBagReasonIfNot: z.string().optional().nullable(),
  bloodTransfusionPints: z.number().int().min(0).optional().nullable(),
  cabinUsed: z.boolean().optional().nullable(),
  maternalOutcome: maternalOutcomeEnum.optional().nullable(),
  referredToFacilityId: z.uuid().optional().nullable(),
  transportIncentiveEligible: z.boolean().optional().nullable(),
  transportIncentiveReceived: z.boolean().optional().nullable(),
  transportIncentiveAmount: z.number().int().min(0).optional().nullable(),
  transportIncentiveReasonIfNot: z.string().optional().nullable(),

  children: z
    .array(
      z.object({
        weightOfBaby: z.number().optional().nullable(),
        newBornBabyStatus: z.string().max(255).optional().nullable(),
        apgarScore1: z.number().int().optional().nullable(),
        apgarScore2: z.number().int().optional().nullable(),
        sex: z.enum(["male", "female", "other"]).optional().nullable(),
        neonatalStatus: neonatalStatusEnum.optional().nullable(),
        isTerm: z.boolean().optional().nullable(),
        congenitalAnomalyMajor: z.boolean().optional().nullable(),
        congenitalAnomalyMinor: z.boolean().optional().nullable(),
        congenitalAnomalyOtherCount: z
          .number()
          .int()
          .min(0)
          .optional()
          .nullable(),
        congenitalAnomalyIcdCode: z.string().max(50).optional().nullable(),
      }),
    )
    .optional(),
});

export type DeliveryCreateInput = z.infer<typeof deliveryCreateSchema>;

export const deliveriesListQuerySchema = createListQuerySchema({
  patientId: z.uuid().optional(),
  pregnancyId: z.uuid().optional(),
});

export type DeliveriesListQuery = z.infer<typeof deliveriesListQuerySchema>;

// ---- PNC ----

export const postnatalCareCreateSchema = z.object({
  visitId: z.uuid(),
  visitingTime: z.string().min(1).max(100),
  visitTime: z.string().min(1).max(100),
  visitDate: isoDateString,
  conditionOfMother: z.string().min(1),
  conditionOfBaby: z.string().min(1),
  medicalAdvice: z.string().min(1),
  familyPlanningServices: z.string().min(1),
  complications: z.string().min(1),
  dangerSignsOnMother: z.string().min(1),
  dangerSignsOnBaby: z.string().min(1),
  checkupAttendedBy: z.string().min(1).max(255),
  newBornBabyStatus: z.string().min(1).max(255),
  refer: z.string().max(255).optional().nullable(),
  referReason: z.string().optional().nullable(),
  otherProblems: z.string().optional().nullable(),
  treatment: z.string().min(1),
  investigation: z.string().optional().nullable(),
  doctorFeedback: z.string().optional().nullable(),
  ironTablet: z.number().int().optional().nullable(),
  calcium: z.number().int().optional().nullable(),
  serviceProvidedBy: z.uuid().optional().nullable(),

  // HMIS 2082 optional extensions
  protocolVisitNumber: pncProtocolVisitEnum.optional().nullable(),
  locationCode: z.enum(["facility", "home"]).optional().nullable(),
  familyPlanningServiceType: familyPlanningPostpartumTypeEnum
    .optional()
    .nullable(),
  fpGivenWithin48h: z.boolean().optional().nullable(),
  fpGivenWithin42d: z.boolean().optional().nullable(),
  vitaminKDate: optionalIsoDateString,
  postnatalBloodTransfusionPints: z
    .number()
    .int()
    .min(0)
    .optional()
    .nullable(),
});

export type PostnatalCareCreateInput = z.infer<
  typeof postnatalCareCreateSchema
>;

export const postnatalCaresListQuerySchema = createListQuerySchema({
  patientId: z.uuid().optional(),
  pregnancyId: z.uuid().optional(),
});

export type PostnatalCaresListQuery = z.infer<
  typeof postnatalCaresListQuerySchema
>;

// ---- Complications ----

export const pregnancyComplicationCreateSchema = z.object({
  stage: complicationStageEnum,
  icd11Code: z.string().max(50).optional().nullable(),
  icd11Title: z.string().optional().nullable(),
  management: complicationManagementEnum.optional().nullable(),
  referredToFacilityId: z.uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  recordedAtAncId: z.uuid().optional().nullable(),
  recordedAtDeliveryId: z.uuid().optional().nullable(),
  recordedAtPncId: z.uuid().optional().nullable(),
});

export type PregnancyComplicationCreateInput = z.infer<
  typeof pregnancyComplicationCreateSchema
>;

// ---- Previous pregnancies ----

export const previousPregnancyItemSchema = z.object({
  ordinal: z.number().int().min(1),
  year: z.number().int().optional().nullable(),
  outcome: z.string().max(40).optional().nullable(),
  deliveryMode: deliveryModeEnum.optional().nullable(),
  complicationIcd11Code: z.string().max(50).optional().nullable(),
  liveBirth: z.boolean().optional().nullable(),
  stillBirth: z.boolean().optional().nullable(),
  preterm: z.boolean().optional().nullable(),
  twin: z.boolean().optional().nullable(),
  abortion: z.boolean().optional().nullable(),
  tdDoseReceived: z.boolean().optional().nullable(),
  childSex: z.enum(["male", "female", "other"]).optional().nullable(),
  childCurrentAgeMonths: z.number().int().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const previousPregnanciesBulkCreateSchema = z.object({
  items: z.array(previousPregnancyItemSchema).min(1),
});

export type PreviousPregnancyItemInput = z.infer<
  typeof previousPregnancyItemSchema
>;

// ---- Screenings (PATCH-like to pregnancies) ----

export const screeningPatchSchema = z.object({
  rousgFirstDate: optionalIsoDateString,
  hivTestDate: optionalIsoDateString,
  hivResult: testResultEnum.optional().nullable(),
  hivTreatmentOrReferral: z.string().optional().nullable(),
  hbsagTestDate: optionalIsoDateString,
  hbsagResult: testResultEnum.optional().nullable(),
  hbsagTreatmentOrReferral: z.string().optional().nullable(),
  syphilisTreponemalDate: optionalIsoDateString,
  syphilisTreponemalResult: testResultEnum.optional().nullable(),
  syphilisNontreponemalDate: optionalIsoDateString,
  syphilisNontreponemalResult: testResultEnum.optional().nullable(),
  syphilisTreatmentOrReferral: z.string().optional().nullable(),
  tbSputumTestDate: optionalIsoDateString,
  dewormingDate: optionalIsoDateString,
});

export type ScreeningPatchInput = z.infer<typeof screeningPatchSchema>;

// ---- TD doses ----

export const tdDosesPatchSchema = z.object({
  td1Date: optionalIsoDateString,
  td2Date: optionalIsoDateString,
  td2plusDate: optionalIsoDateString,
});

export type TdDosesPatchInput = z.infer<typeof tdDosesPatchSchema>;

// ---- Aama incentive ----

export const aamaIncentivePatchSchema = z.object({
  ancIncentiveEligible: z.boolean().optional().nullable(),
  ancIncentiveReceived: z.boolean().optional().nullable(),
  ancIncentiveAmount: z.number().int().min(0).optional().nullable(),
  ancIncentiveReasonIfNot: z.string().optional().nullable(),
  ancIncentivePaidAt: optionalIsoDateString,
});

export type AamaIncentivePatchInput = z.infer<typeof aamaIncentivePatchSchema>;

// ---- Maternal/Newborn deaths ----

export const maternalDeathCreateSchema = z.object({
  patientId: z.uuid(),
  pregnancyId: z.uuid().optional().nullable(),
  deathDate: isoDateString,
  place: z.string().max(30).optional().nullable(),
  placeDetail: z.string().optional().nullable(),
  stage: maternalDeathStageEnum,
  causeIcd11Code: z.string().max(50).optional().nullable(),
  causeText: z.string().optional().nullable(),
});

export type MaternalDeathCreateInput = z.infer<
  typeof maternalDeathCreateSchema
>;

export const newbornDeathCreateSchema = z.object({
  deliveryId: z.uuid().optional().nullable(),
  deliveryChildId: z.uuid().optional().nullable(),
  patientId: z.uuid(),
  deathDate: isoDateString,
  ageAtDeathHours: z.number().int().min(0).optional().nullable(),
  causeIcd11Code: z.string().max(50).optional().nullable(),
  causeText: z.string().optional().nullable(),
});

export type NewbornDeathCreateInput = z.infer<typeof newbornDeathCreateSchema>;

// ---- Safe abortion ----

export const safeAbortionCreateSchema = z.object({
  patientId: z.uuid(),
  procedureDate: isoDateString,
  hmisEthnicCode: hmisEthnicCodeEnum.optional().nullable(),
  age: z.number().int().min(0).max(120).optional().nullable(),
  education: z.string().max(50).optional().nullable(),
  gravidaNum: z.number().int().min(0).optional().nullable(),
  livingChildrenNum: z.number().int().min(0).optional().nullable(),
  gestationByLmpWeeks: z.number().int().min(0).max(60).optional().nullable(),
  gestationByExamWeeks: z.number().int().min(0).max(60).optional().nullable(),
  procedure: abortionProcedureEnum,
  painManagementGiven: z.boolean().optional().nullable(),
  visitId: z.uuid().optional().nullable(),
  encounterId: z.uuid().optional().nullable(),
});

export type SafeAbortionCreateInput = z.infer<typeof safeAbortionCreateSchema>;

export const safeAbortionComplicationCreateSchema = z.object({
  icd11Code: z.string().max(50).optional().nullable(),
  icd11Title: z.string().optional().nullable(),
  complicationKind: z
    .enum([
      "incomplete_repeat",
      "heavy_bleeding",
      "uterine_injury",
      "infection",
      "ongoing_pregnancy",
      "ectopic",
      "other",
    ])
    .optional()
    .nullable(),
  management: complicationManagementEnum.optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type SafeAbortionComplicationCreateInput = z.infer<
  typeof safeAbortionComplicationCreateSchema
>;

export const postAbortionCareCreateSchema = z.object({
  safeAbortionId: z.uuid().optional().nullable(),
  patientId: z.uuid(),
  indication: pacIndicationEnum,
  careDate: isoDateString,
  fpServiceProvided: z.string().max(40).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type PostAbortionCareCreateInput = z.infer<
  typeof postAbortionCareCreateSchema
>;

// ---- Population targets ----

export const facilityPopulationTargetUpsertSchema = z.object({
  fiscalYear: z.number().int().min(2070).max(2200),
  expectedPregnancies: z.number().int().min(0),
  expectedDeliveries: z.number().int().min(0),
});

export type FacilityPopulationTargetUpsertInput = z.infer<
  typeof facilityPopulationTargetUpsertSchema
>;
