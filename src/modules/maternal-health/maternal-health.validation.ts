import { z } from "zod";
import { createListQuerySchema } from "../../utils/query-parser";
import { isoDateString, optionalIsoDateString } from "../../validations/common.validation";

export const pregnancyCreateSchema = z.object({
  firstVisit: optionalIsoDateString,
  gravida: z.number().min(1).max(50),
  para: z.number().max(50).optional().nullable(),
  lastMenstruationPeriod: optionalIsoDateString,
  expectedDeliveryDate: optionalIsoDateString,
  assignedFchvId: z.uuid().optional().nullable(),
});

export type PregnancyCreateInput = z.infer<typeof pregnancyCreateSchema>;

export const pregnanciesListQuerySchema = createListQuerySchema({
  patientId: z.uuid().optional(),
});

export type PregnanciesListQuery = z.infer<typeof pregnanciesListQuerySchema>;

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
});

export type DeliveryCreateInput = z.infer<typeof deliveryCreateSchema>;

export const deliveriesListQuerySchema = createListQuerySchema({
  patientId: z.uuid().optional(),
  pregnancyId: z.uuid().optional(),
});

export type DeliveriesListQuery = z.infer<typeof deliveriesListQuerySchema>;

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
