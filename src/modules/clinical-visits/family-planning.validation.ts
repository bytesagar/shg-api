import { z } from "zod";

const fpOldSchema = z.object({
  previousDevice: z.enum([
    "condom",
    "pills",
    "depo",
    "iucd",
    "implant",
    "vasectomy",
    "minilap",
    "none",
  ]).optional().nullable(),
  continueSameDevice: z.boolean().optional().nullable(),
  discontinueReason: z.string().optional().nullable(),
  discontinueReasonOther: z.string().optional().nullable(),
});

const fpHormonalDetailsSchema = z.object({
  swellingLegOrBreathShortness: z.boolean(),
  painSwellingLegPregnancy: z.boolean(),
  regularMenstrualBleeding: z.boolean(),
  menstruationBleedingAmount: z.boolean(),
  bleedingBetweenPeriods: z.boolean(),
  jaundice: z.boolean(),
  diabetes: z.boolean(),
  severeHeadache: z.boolean(),
  lumpOrSwellingBreast: z.boolean(),
});

const fpNewSchema = z.object({
  lastMenstrualPeriod: z
    .preprocess((val) => (typeof val === "string" ? new Date(val) : val), z.date())
    .optional()
    .nullable(),
  devicePlanned: z.enum([
    "condom",
    "pills",
    "depo",
    "iucd",
    "implant",
    "vasectomy",
    "minilap",
    "none",
  ]),
  deviceUsed: z.enum([
    "condom",
    "pills",
    "depo",
    "iucd",
    "implant",
    "vasectomy",
    "minilap",
    "none",
  ]),
  isActive: z.boolean().optional().nullable(),
  deviceNotUsedReason: z.string().optional().nullable(),
  usageTimePeriod: z.enum(["within_45_days", "after_45_days"]).optional().nullable(),
  usageDate: z
    .preprocess((val) => (typeof val === "string" ? new Date(val) : val), z.date())
    .optional()
    .nullable(),
  followUpDate: z
    .preprocess((val) => (typeof val === "string" ? new Date(val) : val), z.date())
    .optional()
    .nullable(),
  previous: fpOldSchema.optional().nullable(),
  hormonalDetails: fpHormonalDetailsSchema.optional().nullable(),
});

const fpRemovalSchema = z.object({
  previous: fpOldSchema.optional().nullable(),
  lastMenstrualPeriod: z
    .preprocess((val) => (typeof val === "string" ? new Date(val) : val), z.date())
    .optional()
    .nullable(),
  removalDate: z.preprocess(
    (val) => (typeof val === "string" ? new Date(val) : val),
    z.date(),
  ),
  placeOfFpDeviceUsed: z.string().max(255).optional().nullable(),
  otherHealthFacilityName: z.string().max(255).optional().nullable(),
  removalReason: z.string().optional().nullable(),
});

export const familyPlanningCreateSchema = z.discriminatedUnion("serviceType", [
  z.object({
    serviceType: z.literal("new"),
    patientId: z.uuid(),
    serviceDate: z.preprocess(
      (val) => (typeof val === "string" ? new Date(val) : val),
      z.date(),
    ),
    serviceProviderId: z.uuid().optional().nullable(),
    details: fpNewSchema,
  }),
  z.object({
    serviceType: z.literal("follow_up"),
    patientId: z.uuid(),
    serviceDate: z.preprocess(
      (val) => (typeof val === "string" ? new Date(val) : val),
      z.date(),
    ),
    serviceProviderId: z.uuid().optional().nullable(),
    details: fpNewSchema,
  }),
  z.object({
    serviceType: z.literal("removal"),
    patientId: z.uuid(),
    serviceDate: z.preprocess(
      (val) => (typeof val === "string" ? new Date(val) : val),
      z.date(),
    ),
    serviceProviderId: z.uuid().optional().nullable(),
    details: fpRemovalSchema,
  }),
]);

export type FamilyPlanningCreateInput = z.infer<
  typeof familyPlanningCreateSchema
>;

