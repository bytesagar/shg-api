import { z } from "zod";

export const userCreateSchema = z
  .object({
    email: z.string().email("Invalid email").max(255),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(255),
    username: z.string().max(255).optional().nullable(),
    firstName: z.string().min(1, "First name is required").max(255),
    lastName: z.string().min(1, "Last name is required").max(255),
    phoneNumber: z.string().min(7, "Phone number is required").max(50),
    designation: z.string().max(255).optional().nullable(),
    municipalityId: z.uuid().optional().nullable(),
    facilityId: z.uuid().optional().nullable(),
    userRoleId: z.uuid(),
    roleIds: z.array(z.uuid()).optional().nullable(),
    specialization: z.string().max(255).optional().nullable(),
    nmcRegistrationNumber: z.string().max(100).optional().nullable(),
    signatureUrl: z.string().max(500).optional().nullable(),
  })
  .strict();

export type UserCreateInput = z.infer<typeof userCreateSchema>;
