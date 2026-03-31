import { z } from "zod";

export const patientCreateSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(255),
  lastName: z.string().min(1, "Last name is required").max(255),
  middleName: z.string().max(255).optional().nullable(),
  name: z.string().max(255).optional().nullable(),
  caste: z.enum([
    "dalit",
    "janajati",
    "madhesi",
    "muslim",
    "brahmin_chhetri",
    "other",
  ]),
  age: z.number().int().min(0).max(120),
  ageUnit: z.enum(["years", "months", "days"]).default("years"),
  dob: z.preprocess(
    (val) => (typeof val === "string" ? new Date(val) : val),
    z.date().optional().nullable(),
  ),
  gender: z.enum(["male", "female", "other"]),
  province: z.string().min(1, "Province is required").max(255),
  district: z.string().min(1, "District is required").max(255),
  palika: z.string().min(1, "Palika is required").max(255),
  provinceId: z.string().uuid().optional().nullable(),
  districtId: z.string().uuid().optional().nullable(),
  municipalityId: z.string().uuid().optional().nullable(),
  ward: z.number().int().min(1),
  phoneNumber: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(50),
  service: z.string().min(1, "Service is required").max(255),
  nationalId: z.string().max(100).optional().nullable(),
  nhisNumber: z.string().max(100).optional().nullable(),
  facilityId: z.string().uuid().optional().nullable(),
  assignedUserId: z.string().uuid().optional().nullable(),
  status: z
    .enum(["active", "inactive", "deceased", "discharged", "referred"])
    .default("active"),
  education: z.string().max(255).optional().nullable(),
  occupation: z.string().max(255).optional().nullable(),
  otherOccupation: z.string().max(255).optional().nullable(),
  spouseName: z.string().max(255).optional().nullable(),
  childrenMale: z.number().int().min(0).optional().nullable(),
  childrenFemale: z.number().int().min(0).optional().nullable(),
});

export type PatientCreateInput = z.infer<typeof patientCreateSchema>;
