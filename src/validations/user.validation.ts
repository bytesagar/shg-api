import { z } from "zod";

export const userCreateSchema = z.object({
  email: z.string().email("Invalid email").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(255),
  username: z.string().max(255).optional().nullable(),
  firstName: z.string().min(1, "First name is required").max(255),
  lastName: z.string().min(1, "Last name is required").max(255),
  userType: z.enum(["admin", "user", "facility", "doctor"]),
  phoneNumber: z.string().min(7, "Phone number is required").max(50),
  designation: z.string().max(255).optional().nullable(),
  municipalityId: z.string().uuid().optional().nullable(),
  userRoleId: z.string().uuid().optional().nullable(),
  specialization: z.string().max(255).optional().nullable(),
  nmcRegistrationNumber: z.string().max(100).optional().nullable(),
  signatureUrl: z.string().max(500).optional().nullable(),
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;
