import { z } from "zod";
import {
  isoDateString,
  optionalIsoDateString,
} from "../../validations/common.validation";

export const childImmunizationUpsertSchema = z
  .object({
    mothersName: z.string().min(1).max(255),
    fathersName: z.string().min(1).max(255),
    weightAtBirth: z.number().positive().optional().nullable(),

    // HMIS 2082 optional extensions (ethnicity derives from the patient's
    // person.caste — not duplicated here).
    birthOrder: z.number().int().min(1).max(20).optional().nullable(),
    delayedScheduleStartedAtMonths: z
      .number()
      .int()
      .min(0)
      .max(60)
      .optional()
      .nullable(),
    outOfCatchment: z.boolean().optional(),
    serviceRegistrationNumber: z.string().max(50).optional().nullable(),
    enrolledFiscalYear: z.number().int().min(2070).max(2200).optional().nullable(),
  })
  .strict();

export type ChildImmunizationUpsertInput = z.infer<
  typeof childImmunizationUpsertSchema
>;

// ---- HMIS 2082 dose entry ----

export const IMMUNIZATION_MODES = [
  "routine",
  "campaign",
  "school",
  "catch_up",
  "outbreak_response",
] as const;

export const VACCINE_SITES = [
  "left_arm",
  "right_arm",
  "left_thigh",
  "right_thigh",
  "oral",
  "other",
] as const;

export const VACCINE_ROUTES = [
  "im",
  "sc",
  "id",
  "po",
  "nasal",
  "other",
] as const;

/**
 * A single dose entry. Either:
 *   - structured: `vaccineCode` + `doseNumber` are required (preferred), or
 *   - legacy: free-text `vaccineName` only (back-compat with existing clients).
 *
 * Validation enforces "one of the two shapes" via `.superRefine`.
 */
export const immunizationDoseEntrySchema = z
  .object({
    vaccineCode: z.string().max(40).optional().nullable(),
    doseNumber: z.number().int().min(1).max(20).optional().nullable(),
    vaccineName: z.string().max(255).optional().nullable(),
    date: optionalIsoDateString, // scheduled date (legacy)
    vaccinated: z.boolean().optional(),
    vaccinatedDate: optionalIsoDateString,
    administeredAt: z.iso.datetime().optional().nullable(),
    administeredBy: z.uuid().optional().nullable(),
    mode: z.enum(IMMUNIZATION_MODES).optional(),
    campaignId: z.uuid().optional().nullable(),
    hpvSessionId: z.uuid().optional().nullable(),
    batchNumber: z.string().max(60).optional().nullable(),
    diluentBatchNumber: z.string().max(60).optional().nullable(),
    lotNumber: z.string().max(60).optional().nullable(),
    expiryDate: optionalIsoDateString,
    site: z.enum(VACCINE_SITES).optional().nullable(),
    route: z.enum(VACCINE_ROUTES).optional().nullable(),
    sourceFacilityName: z.string().max(255).optional().nullable(),
    aefi: z.string().optional().nullable(), // legacy free-text
  })
  .superRefine((val, ctx) => {
    const hasStructured = !!val.vaccineCode && !!val.doseNumber;
    const hasLegacy = !!val.vaccineName;
    if (!hasStructured && !hasLegacy) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Provide either (vaccineCode + doseNumber) or vaccineName for back-compat",
        path: ["vaccineCode"],
      });
    }
  });

export type ImmunizationDoseEntryInput = z.infer<
  typeof immunizationDoseEntrySchema
>;

/**
 * Batch dose payload. Accepts either:
 *   - `{ doses: [...] }` for batch entry (preferred), or
 *   - a flat single-dose body (back-compat with the previous v1 shape).
 *
 * The controller normalises both into an array before calling the service.
 */
export const immunizationDosesCreateSchema = z.union([
  z.object({ doses: z.array(immunizationDoseEntrySchema).min(1).max(20) }),
  immunizationDoseEntrySchema, // single flat dose
]);

export type ImmunizationDosesCreateInput = z.infer<
  typeof immunizationDosesCreateSchema
>;

// ---- AEFI ----

export const AEFI_SEVERITIES = ["mild", "severe"] as const;
export const AEFI_OUTCOMES = [
  "recovered",
  "recovering",
  "referred",
  "died",
  "unknown",
] as const;

export const aefiCreateSchema = z
  .object({
    immunizationHistoryId: z.uuid(),
    parentName: z.string().max(255).optional().nullable(),
    parentContact: z.string().max(50).optional().nullable(),
    aefiRegisteredAt: isoDateString,
    vaccineBatch: z.string().max(60).optional().nullable(),
    diluentBatch: z.string().max(60).optional().nullable(),
    vaccinatedAt: z.iso.datetime().optional().nullable(),
    vaccinationPlace: z.string().optional().nullable(),
    symptomOnsetAt: z.iso.datetime().optional().nullable(),
    symptoms: z.string().optional().nullable(),
    severity: z.enum(AEFI_SEVERITIES),
    outcome: z.enum(AEFI_OUTCOMES).optional().nullable(),
    management: z.string().optional().nullable(),
    referredToFacilityId: z.uuid().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .strict();

export type AefiCreateInput = z.infer<typeof aefiCreateSchema>;

// ---- Campaign ----

export const campaignCreateSchema = z
  .object({
    vaccineCode: z.string().max(40),
    roundNumber: z.number().int().min(1).max(20).optional().nullable(),
    campaignKind: z
      .enum(["national", "outbreak_response"])
      .optional()
      .nullable(),
    startDate: isoDateString,
    endDate: optionalIsoDateString,
    targetAgeMinMonths: z.number().int().min(0).optional().nullable(),
    targetAgeMaxMonths: z.number().int().min(0).optional().nullable(),
    targetPopulation: z.number().int().min(0).optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .strict();

export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>;

// ---- HPV school session ----

export const hpvSessionCreateSchema = z
  .object({
    schoolName: z.string().max(255).optional().nullable(),
    sessionDate: isoDateString,
    grade: z.string().max(20).optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .strict();

export type HpvSessionCreateInput = z.infer<typeof hpvSessionCreateSchema>;

// ---- Feeding milestones ----

export const feedingMilestonesUpsertSchema = z
  .object({
    breastfedWithin1h: z.boolean().optional().nullable(),
    exclusiveBfMonths: z.number().int().min(0).max(24).optional().nullable(),
    complementaryFeedingStartAgeMonths: z
      .number()
      .int()
      .min(0)
      .max(24)
      .optional()
      .nullable(),
    notes: z.string().optional().nullable(),
  })
  .strict();

export type FeedingMilestonesUpsertInput = z.infer<
  typeof feedingMilestonesUpsertSchema
>;

// ---- Back-compat: keep the legacy single-dose schema unchanged so existing
// service and controller code keeps compiling. The new structured shape lives
// in `immunizationDoseEntrySchema` above; the controller normalises both.
export const immunizationHistoryCreateSchema = z
  .object({
    vaccineName: z.string().min(1).max(255),
    date: isoDateString,
    vaccinated: z.boolean(),
    vaccinatedDate: optionalIsoDateString,
    aefi: z.string().optional().nullable(),
  })
  .strict();

export type ImmunizationHistoryCreateInput = z.infer<
  typeof immunizationHistoryCreateSchema
>;
