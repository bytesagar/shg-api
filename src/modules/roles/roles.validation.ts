import { z } from "zod";
import { createListQuerySchema } from "../../utils/query-parser";
import { isValidPermission } from "../../constants/rbac";

export const roleIdParamSchema = z
  .object({
    id: z.uuid(),
  })
  .strict();

const permissionSchema = z
  .string()
  .refine(isValidPermission, "Unknown permission");

export const roleCreateSchema = z
  .object({
    name: z.string().min(1).max(255),
    description: z.string().min(1).max(1000),
    permissions: z.array(permissionSchema).optional().default([]),
  })
  .strict();

export type RoleCreateInput = z.infer<typeof roleCreateSchema>;

export const roleUpdateSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().min(1).max(1000).optional(),
    permissions: z.array(permissionSchema).optional(),
  })
  .strict();

export type RoleUpdateInput = z.infer<typeof roleUpdateSchema>;

export const rolesListQuerySchema = createListQuerySchema({
  searchString: z.string().min(1).max(100).optional(),
});

export type RolesListQuery = z.infer<typeof rolesListQuerySchema>;
