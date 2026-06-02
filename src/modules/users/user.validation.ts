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

/**
 * Payload for `PATCH /users/:id`. All fields optional (partial update);
 * password is only re-hashed when present. `.strict()` rejects unknown keys
 * and the refine guards an empty body.
 */
export const userUpdateSchema = z
  .object({
    email: z.string().email("Invalid email").max(255),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(255),
    username: z.string().max(255).nullable(),
    firstName: z.string().min(1, "First name is required").max(255),
    lastName: z.string().min(1, "Last name is required").max(255),
    phoneNumber: z.string().min(7, "Phone number is required").max(50),
    designation: z.string().max(255).nullable(),
    municipalityId: z.uuid().nullable(),
    facilityId: z.uuid().nullable(),
    userRoleId: z.uuid(),
    specialization: z.string().max(255).nullable(),
    nmcRegistrationNumber: z.string().max(100).nullable(),
    signatureUrl: z.string().max(500).nullable(),
  })
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

/**
 * Payload for `POST /users/:id/reset-password` — an admin sets a brand-new
 * password for the target user. This is a privileged override (no current
 * password required), distinct from a token-based self-service reset.
 */
export const userResetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(255),
  })
  .strict();

export type UserResetPasswordInput = z.infer<typeof userResetPasswordSchema>;

export const userIdParamsSchema = z.object({ id: z.uuid() }).strict();
