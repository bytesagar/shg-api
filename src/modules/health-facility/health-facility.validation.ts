import { z } from "zod";

export const healthFacilityCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  address: z.string().min(1, "Address is required"),
  phone: z.string().min(7, "Phone is required").max(50),
  email: z.string().email("Invalid email").max(255),
  ward: z.string().min(1, "Ward is required").max(100),
  palika: z.string().min(1, "Palika is required").max(255),
  district: z.string().min(1, "District is required").max(255),
  province: z.string().min(1, "Province is required").max(255),
  provinceId: z.uuid().optional().nullable(),
  districtId: z.uuid().optional().nullable(),
  municipalityId: z.uuid().optional().nullable(),
  inchargeName: z.string().min(1, "Incharge name is required").max(255),
  hfCode: z.string().max(100).optional().nullable(),
  authorityLevel: z.string().max(100).optional().nullable(),
  authority: z.string().max(255).optional().nullable(),
  ownership: z.string().max(255).optional().nullable(),
  facilityType: z.string().max(100).optional().nullable(),
});

export type HealthFacilityCreateInput = z.infer<typeof healthFacilityCreateSchema>;

export const facilityDoctorAffiliationParamsSchema = z
  .object({
    facilityId: z.uuid(),
    doctorId: z.uuid(),
  })
  .strict();

export const facilityDoctorAffiliationUpsertBodySchema = z
  .object({
    roleId: z.uuid().optional().nullable(),
  })
  .strict();

export type FacilityDoctorAffiliationUpsertInput = z.infer<
  typeof facilityDoctorAffiliationUpsertBodySchema
>;
