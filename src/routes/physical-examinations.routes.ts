import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { CLINICAL_READ_ROLES } from "../constants/rbac";
import { PhysicalExaminationsController } from "../modules/physical-examinations/physical-examinations.controller";

const router = Router();
const physicalExaminationsController = new PhysicalExaminationsController();

router.get(
  "/",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  physicalExaminationsController.getPhysicalExaminations,
);

export default router;
