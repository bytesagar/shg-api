import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { ADMIN_ONLY_ROLES } from "../constants/rbac";
import { RoleController } from "@/modules/roles/roles.controller";

const router = Router();
const controller = new RoleController();

router.get(
  "/",
  authMiddleware,
  authorize([...ADMIN_ONLY_ROLES]),
  controller.listRoles,
);
router.get(
  "/:id",
  authMiddleware,
  authorize([...ADMIN_ONLY_ROLES]),
  controller.getRole,
);
router.post(
  "/",
  authMiddleware,
  authorize([...ADMIN_ONLY_ROLES]),
  controller.createRole,
);
router.patch(
  "/:id",
  authMiddleware,
  authorize([...ADMIN_ONLY_ROLES]),
  controller.updateRole,
);
router.delete(
  "/:id",
  authMiddleware,
  authorize([...ADMIN_ONLY_ROLES]),
  controller.deleteRole,
);

export default router;
