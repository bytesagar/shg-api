import { Router } from "express";

import { authMiddleware } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { CLINICAL_READ_ROLES, CLINICAL_WRITE_ROLES } from "../constants/rbac";
import { LabOrderController } from "../modules/lab-orders/lab-order.controller";

const router = Router();
const controller = new LabOrderController();

router.use(authMiddleware);

// Worklist reads — any authenticated facility user. Writes (ordering,
// sample collection, result entry, report upload) are clinical staff only.
router.get("/", authorize([...CLINICAL_READ_ROLES]), controller.list);
router.get("/stats", authorize([...CLINICAL_READ_ROLES]), controller.stats);
router.get("/:id", authorize([...CLINICAL_READ_ROLES]), controller.getById);

router.post("/", authorize([...CLINICAL_WRITE_ROLES]), controller.create);
router.patch(
  "/:id/collect",
  authorize([...CLINICAL_WRITE_ROLES]),
  controller.collect,
);
router.post(
  "/:id/result",
  authorize([...CLINICAL_WRITE_ROLES]),
  controller.recordResult,
);
router.post(
  "/:id/upload",
  authorize([...CLINICAL_WRITE_ROLES]),
  controller.uploadResult,
);

export default router;
