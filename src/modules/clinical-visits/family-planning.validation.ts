import { z } from "zod";
import {
  isoDateString,
  optionalIsoDateString,
} from "../../validations/common.validation";

const fpDeviceSchema = z.enum([
  "condom",
  "pills",
  "depo",
  "iucd",
  "implant",
  "vasectomy",
  "minilap",
  "none",
]);

const fpOldSchema = z
  .object({
    previousDevice: fpDeviceSchema.optional().nullable(),
    continueSameDevice: z.boolean().optional().nullable(),
    discontinueReason: z.string().optional().nullable(),
    discontinueReasonOther: z.string().optional().nullable(),
  })
  .strict();

const fpHormonalDetailsSchema = z
  .object({
    swellingLegOrBreathShortness: z.boolean(),
    painSwellingLegPregnancy: z.boolean(),
    regularMenstrualBleeding: z.boolean(),
    menstruationBleedingAmount: z.boolean(),
    bleedingBetweenPeriods: z.boolean(),
    jaundice: z.boolean(),
    diabetes: z.boolean(),
    severeHeadache: z.boolean(),
    lumpOrSwellingBreast: z.boolean(),
  })
  .strict();

const fpIucdDetailsSchema = z
  .object({
    lowerAbdominalPain: z.boolean(),
    foulSmellingVaginalDischarge: z.boolean(),
    treatedForReproductiveTractInfection: z.boolean(),
  })
  .strict();

const fpNewCommonSchema = z
  .object({
    lastMenstrualPeriod: optionalIsoDateString,
    devicePlanned: fpDeviceSchema,
    isActive: z.boolean().optional().nullable(),
    deviceNotUsedReason: z.string().optional().nullable(),
    usageTimePeriod: z
      .enum(["within_45_days", "after_45_days"])
      .optional()
      .nullable(),
    usageDate: optionalIsoDateString,
    followUpDate: optionalIsoDateString,
    previous: fpOldSchema.optional().nullable(),
  })
  .strict();

const fpNewSchema = z.discriminatedUnion("deviceUsed", [
  fpNewCommonSchema.extend({
    deviceUsed: z.literal("iucd"),
    iucdDetails: fpIucdDetailsSchema,
  }),
  fpNewCommonSchema.extend({
    deviceUsed: z.enum(["pills", "depo", "implant"]),
    hormonalDetails: fpHormonalDetailsSchema,
  }),
  fpNewCommonSchema.extend({
    deviceUsed: z.enum(["condom", "vasectomy", "minilap", "none"]),
  }),
]);

const fpRemovalSchema = z.object({
  previous: fpOldSchema.optional().nullable(),
  lastMenstrualPeriod: optionalIsoDateString,
  removalDate: isoDateString,
  placeOfFpDeviceUsed: z.string().max(255).optional().nullable(),
  otherHealthFacilityName: z.string().max(255).optional().nullable(),
  removalReason: z.string().optional().nullable(),
});

export const familyPlanningCreateSchema = z.discriminatedUnion("serviceType", [
  z.object({
    serviceType: z.literal("new"),
    patientId: z.uuid(),
    serviceDate: isoDateString,
    serviceProviderId: z.uuid().optional().nullable(),
    details: fpNewSchema,
  }),
  z.object({
    serviceType: z.literal("follow_up"),
    patientId: z.uuid(),
    serviceDate: isoDateString,
    serviceProviderId: z.uuid().optional().nullable(),
    details: fpNewSchema,
  }),
  z.object({
    serviceType: z.literal("removal"),
    patientId: z.uuid(),
    serviceDate: isoDateString,
    serviceProviderId: z.uuid().optional().nullable(),
    details: fpRemovalSchema,
  }),
]);

export type FamilyPlanningCreateInput = z.infer<
  typeof familyPlanningCreateSchema
>;
