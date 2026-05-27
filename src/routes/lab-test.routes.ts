import { Router } from "express";

import { authMiddleware } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { AUTHENTICATED_ROLES } from "../constants/rbac";
import { LabTestController } from "../modules/lab-tests/lab-test.controller";

const router = Router();
const controller = new LabTestController();

router.use(authMiddleware);

// Reference catalog — readable by any authenticated user. Mutations are
// not exposed yet; the catalog is seeded from data/lab-tests.json. When
// admin-level CRUD lands, gate POST/PUT/DELETE on ADMIN_ONLY_ROLES.
router.get("/", authorize([...AUTHENTICATED_ROLES]), controller.list);
router.get("/:id", authorize([...AUTHENTICATED_ROLES]), controller.getById);

export default router;
