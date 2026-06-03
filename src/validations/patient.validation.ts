import { z } from "zod";

export const patientCreateSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(255),
  lastName: z.string().min(1, "Last name is required").max(255),
  middleName: z.string().max(255).optional().nullable(),
  birthDate: z.preprocess(
    (val) => (typeof val === "string" ? new Date(val) : val),
    z.date().optional().nullable(),
  ),
  gender: z.enum(["male", "female", "other"]).optional().nullable(),
  bloodGroup: z
    .enum([
      "unknown",
      "a_positive",
      "a_negative",
      "b_positive",
      "b_negative",
      "ab_positive",
      "ab_negative",
      "o_positive",
      "o_negative",
    ])
    .optional()
    .nullable(),
  caste: z
    .enum(["dalit", "janajati", "madhesi", "muslim", "brahmin_chhetri", "other"])
    .optional()
    .nullable(),
  phoneNumber: z.string().min(7).max(50).optional().nullable(),
  identifiers: z
    .array(
      z.object({
        system: z.string().min(1).max(255),
        value: z.string().min(1).max(255),
        use: z.string().max(50).optional().nullable(),
        isPrimary: z.boolean().optional(),
      }),
    )
    .optional()
    .default([]),
  address: z
    .object({
      line1: z.string().max(255).optional().nullable(),
      line2: z.string().max(255).optional().nullable(),
      municipality: z.string().max(255).optional().nullable(),
      district: z.string().max(255).optional().nullable(),
      province: z.string().max(255).optional().nullable(),
      municipalityId: z.uuid().optional().nullable(),
      districtId: z.uuid().optional().nullable(),
      provinceId: z.uuid().optional().nullable(),
      ward: z.number().int().min(1).optional().nullable(),
      postalCode: z.string().max(20).optional().nullable(),
    })
    .optional()
    .nullable(),
  service: z.string().min(1, "Service is required").max(255),
  assignedUserId: z.uuid().optional().nullable(),
  status: z
    .enum(["active", "inactive", "deceased", "discharged", "referred"])
    .default("active"),
  // Family planning service-specific fields (persisted on the patient row).
  education: z.string().min(1).max(255).optional().nullable(),
  occupation: z.string().min(1).max(255).optional().nullable(),
  occupationOther: z.string().max(255).optional().nullable(),
  spouseName: z.string().max(255).optional().nullable(),
  childrenMale: z.number().int().min(0).max(10).optional().nullable(),
  childrenFemale: z.number().int().min(0).max(10).optional().nullable(),

  // Facility's existing register number + date (legacy paper book-keeping).
  // Kept if provided; otherwise the service generates a unique registrationNo
  // and defaults registrationDate to today (YYYY-MM-DD).
  registrationNo: z.string().max(100).optional().nullable(),
  registrationDate: z.string().max(20).optional().nullable(),

  // Maternal health service-specific fields → create a `pregnancies` row.
  firstVisit: z.string().max(20).optional().nullable(),
  gravida: z.union([z.string(), z.number()]).optional().nullable(),
  para: z.union([z.string(), z.number()]).optional().nullable(),
  lastMenstruationPeriod: z.string().max(20).optional().nullable(),
  expectedDeliveryDate: z.string().max(20).optional().nullable(),
  assignedFchvId: z.uuid().optional().nullable(),

  // Immunization service-specific fields → create a `child_immunizations` row.
  mothersName: z.string().max(255).optional().nullable(),
  fathersName: z.string().max(255).optional().nullable(),
  weightAtBirth: z.number().positive().optional().nullable(),
});

export type PatientCreateInput = z.infer<typeof patientCreateSchema>;

/**
 * PATCH /patients/:id. Every field optional (partial update). `undefined` means
 * "leave as-is"; an explicit value (including `null` on nullable fields) is
 * applied. Only covers the demographic / contact / address / admin data that
 * survives registration — service-specific clinical seeding (pregnancy, child
 * immunization profile) is managed from its own tabs, not re-run on edit.
 */
export const patientUpdateSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(255).optional(),
  middleName: z.string().max(255).optional().nullable(),
  lastName: z.string().min(1, "Last name is required").max(255).optional(),
  birthDate: z.preprocess(
    (val) => (typeof val === "string" ? new Date(val) : val),
    z.date().optional().nullable(),
  ),
  gender: z.enum(["male", "female", "other"]).optional().nullable(),
  bloodGroup: z
    .enum([
      "unknown",
      "a_positive",
      "a_negative",
      "b_positive",
      "b_negative",
      "ab_positive",
      "ab_negative",
      "o_positive",
      "o_negative",
    ])
    .optional()
    .nullable(),
  caste: z
    .enum(["dalit", "janajati", "madhesi", "muslim", "brahmin_chhetri", "other"])
    .optional()
    .nullable(),
  phoneNumber: z.string().min(7).max(50).optional().nullable(),
  address: z
    .object({
      line1: z.string().max(255).optional().nullable(),
      line2: z.string().max(255).optional().nullable(),
      municipality: z.string().max(255).optional().nullable(),
      district: z.string().max(255).optional().nullable(),
      province: z.string().max(255).optional().nullable(),
      municipalityId: z.uuid().optional().nullable(),
      districtId: z.uuid().optional().nullable(),
      provinceId: z.uuid().optional().nullable(),
      ward: z.number().int().min(1).optional().nullable(),
      postalCode: z.string().max(20).optional().nullable(),
    })
    .optional()
    .nullable(),
  service: z.string().min(1).max(255).optional(),
  assignedUserId: z.uuid().optional().nullable(),
  status: z
    .enum(["active", "inactive", "deceased", "discharged", "referred"])
    .optional(),
  education: z.string().max(255).optional().nullable(),
  occupation: z.string().max(255).optional().nullable(),
  occupationOther: z.string().max(255).optional().nullable(),
  spouseName: z.string().max(255).optional().nullable(),
  childrenMale: z.number().int().min(0).max(10).optional().nullable(),
  childrenFemale: z.number().int().min(0).max(10).optional().nullable(),
  // Links a previously-uploaded `profile_photo` attachment (sourceType
  // "Patient", same facility) as this patient's profile picture. `null` clears.
  photoAttachmentId: z.uuid().optional().nullable(),
});

export type PatientUpdateInput = z.infer<typeof patientUpdateSchema>;

export const patientFamilyPlanningProfileSchema = z
  .object({
    education: z.string().min(1, "Education is required").max(255),
    occupation: z.string().min(1, "Occupation is required").max(255),
    occupationOther: z.string().max(255).optional().nullable(),
    spouseName: z.string().max(255).optional().nullable(),
    childrenMale: z.number().int().min(0).max(10).optional().nullable(),
    childrenFemale: z.number().int().min(0).max(10).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.occupation.trim().toLowerCase() === "other") {
      if (!data.occupationOther || data.occupationOther.trim().length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["occupationOther"],
          message: "Please specify other occupation",
        });
      }
    }
  });

export type PatientFamilyPlanningProfileInput = z.infer<
  typeof patientFamilyPlanningProfileSchema
>;
