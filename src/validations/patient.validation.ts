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
});

export type PatientCreateInput = z.infer<typeof patientCreateSchema>;
