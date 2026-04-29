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
  education: z.string().min(1).max(255).optional().nullable(),
  occupation: z.string().min(1).max(255).optional().nullable(),
  occupationOther: z.string().max(255).optional().nullable(),
  spouseName: z.string().max(255).optional().nullable(),
  childrenMale: z.number().int().min(0).max(10).optional().nullable(),
  childrenFemale: z.number().int().min(0).max(10).optional().nullable(),
});

export type PatientCreateInput = z.infer<typeof patientCreateSchema>;

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
