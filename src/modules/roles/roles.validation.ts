import { z } from "zod";
import { createListQuerySchema } from "../../utils/query-parser";

export const roleIdParamSchema = z
  .object({
    id: z.uuid(),
  })
  .strict();

export const roleCreateSchema = z
  .object({
    name: z.string().min(1).max(255),
    description: z.string().min(1).max(1000),
  })
  .strict();

export type RoleCreateInput = z.infer<typeof roleCreateSchema>;

export const roleUpdateSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().min(1).max(1000).optional(),
  })
  .strict();

export type RoleUpdateInput = z.infer<typeof roleUpdateSchema>;

export const rolesListQuerySchema = createListQuerySchema({
  searchString: z.string().min(1).max(100).optional(),
});

export type RolesListQuery = z.infer<typeof rolesListQuerySchema>;
