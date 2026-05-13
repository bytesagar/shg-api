import { z } from "zod";
import { createListQuerySchema, optionalQueryString } from "@/utils/query-parser";
import { IMNCI_FCHV_COMMODITIES } from "@/constants/imnci";

// ---------------------------------------------------------------------------
// Visit lifecycle
// ---------------------------------------------------------------------------

export const startVisitSchema = z
  .object({
    patientId: z.uuid(),
    weightKg: z.number().positive().max(100).optional(),
    tempC: z.number().min(25).max(45).optional(),
    muacMm: z.number().int().min(50).max(250).optional(),
    reason: z.string().min(1).max(500).optional(),
  })
  .strict();

export type StartVisitInput = z.infer<typeof startVisitSchema>;

const answerValueSchema = z.union([z.boolean(), z.number(), z.string()]);

export const saveAnswersSchema = z
  .object({
    answers: z
      .array(
        z
          .object({
            questionKey: z.string().min(1).max(128),
            value: answerValueSchema.nullable(),
          })
          .strict(),
      )
      .min(1)
      .max(200),
  })
  .strict();

export type SaveAnswersInput = z.infer<typeof saveAnswersSchema>;

export const confirmPlanItemSchema = z
  .object({
    id: z.uuid(),
    status: z.enum(["confirmed", "overridden", "cancelled"]),
    notes: z.string().max(1000).optional(),
  })
  .strict();

export const confirmTreatmentPlanSchema = z
  .object({
    items: z.array(confirmPlanItemSchema).min(1),
  })
  .strict();

export type ConfirmTreatmentPlanInput = z.infer<typeof confirmTreatmentPlanSchema>;

export const createReferralSchema = z
  .object({
    toFacilityId: z.uuid().optional(),
    reason: z.string().min(1).max(1000),
    preReferralTreatmentGiven: z
      .array(
        z
          .object({
            drugCode: z.string().min(1).max(64),
            doseAmount: z.number().positive().optional(),
            doseUnit: z.string().max(32).optional(),
            notes: z.string().max(500).optional(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

export type CreateReferralInput = z.infer<typeof createReferralSchema>;

export const visitsListQuerySchema = createListQuerySchema({
  patientId: z.uuid().optional(),
  status: z
    .enum(["in_progress", "classified", "completed", "referred"])
    .optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  classificationCode: optionalQueryString,
});

export const followUpsListQuerySchema = createListQuerySchema({
  status: z.enum(["scheduled", "completed", "missed"]).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  patientId: z.uuid().optional(),
});

export const completeFollowUpSchema = z
  .object({
    completedVisitId: z.uuid().optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// FCHV
// ---------------------------------------------------------------------------

export const fchvScreeningCreateSchema = z
  .object({
    patientId: z.uuid().optional(),
    visitedAt: z.iso.datetime().optional(),
    location: z
      .object({
        ward: z.string().max(20).optional(),
        village: z.string().max(255).optional(),
        gps: z
          .object({
            lat: z.number(),
            lng: z.number(),
          })
          .optional(),
      })
      .strict()
      .optional(),
    dangerSignsFound: z.array(z.string().min(1).max(64)).max(20),
    referralRecommended: z.boolean().default(false),
    referralUrgency: z.enum(["urgent", "routine"]).optional(),
    notes: z.string().max(1000).optional(),
  })
  .strict();

export const fchvDispenseSchema = z
  .object({
    commodity: z.enum(IMNCI_FCHV_COMMODITIES),
    quantity: z.number().positive(),
    unit: z.string().min(1).max(32),
    batchNo: z.string().max(64).optional(),
    dispensedAt: z.iso.datetime().optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// HMIS aggregate reports
// ---------------------------------------------------------------------------

export const reportsQuerySchema = z
  .object({
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    facilityId: z.uuid().optional(),
  })
  .strict();

export type ReportsQuery = z.infer<typeof reportsQuerySchema>;

export const fchvScreeningsListQuerySchema = createListQuerySchema({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  referralRecommended: z
    .preprocess(
      (v) => (typeof v === "string" ? v.toLowerCase() : v),
      z.enum(["true", "false"]).optional(),
    )
    .transform((v) => (v === undefined ? undefined : v === "true")),
});
