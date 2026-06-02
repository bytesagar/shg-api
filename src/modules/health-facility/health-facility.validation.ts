import { z } from "zod";

export const healthFacilityCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  address: z.string().max(1000).optional().nullable(),
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

/**
 * Payload for `PATCH /health-facilities/:id`. Every field is optional so the
 * client can send a partial update; `.strict()` rejects unknown keys and the
 * refine guards against an empty body.
 */
export const healthFacilityUpdateSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(255),
    address: z.string().max(1000).nullable(),
    phone: z.string().min(7, "Phone is required").max(50),
    email: z.string().email("Invalid email").max(255),
    ward: z.string().min(1, "Ward is required").max(100),
    palika: z.string().min(1, "Palika is required").max(255),
    district: z.string().min(1, "District is required").max(255),
    province: z.string().min(1, "Province is required").max(255),
    provinceId: z.uuid().nullable(),
    districtId: z.uuid().nullable(),
    municipalityId: z.uuid().nullable(),
    inchargeName: z.string().min(1, "Incharge name is required").max(255),
    hfCode: z.string().max(100).nullable(),
    authorityLevel: z.string().max(100).nullable(),
    authority: z.string().max(255).nullable(),
    ownership: z.string().max(255).nullable(),
    facilityType: z.string().max(100).nullable(),
  })
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type HealthFacilityUpdateInput = z.infer<typeof healthFacilityUpdateSchema>;

export const healthFacilityIdParamsSchema = z
  .object({ id: z.uuid() })
  .strict();

export const facilityDoctorAffiliationParamsSchema = z
  .object({
    facilityId: z.uuid(),
  })
  .strict();

export const facilityDoctorAffiliationLegacyParamsSchema = z
  .object({
    facilityId: z.uuid(),
    doctorId: z.uuid(),
  })
  .strict();

export const facilityDoctorAffiliationDeactivateParamsSchema = z
  .object({
    facilityId: z.uuid(),
    doctorId: z.uuid(),
  })
  .strict();

export const facilityDoctorAffiliationUpsertBodySchema = z
  .object({
    doctorIds: z.preprocess(
      (v) => (typeof v === "string" ? [v] : v),
      z.array(z.uuid()).min(1),
    ),
    roleId: z.uuid().optional().nullable(),
  })
  .strict();

export type FacilityDoctorAffiliationUpsertInput = z.infer<
  typeof facilityDoctorAffiliationUpsertBodySchema
>;
