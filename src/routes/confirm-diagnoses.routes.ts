import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { CLINICAL_READ_ROLES } from "../constants/rbac";
import { ConfirmDiagnosesController } from "../modules/confirm-diagnoses/confirm-diagnoses.controller";

const router = Router();
const confirmDiagnosesController = new ConfirmDiagnosesController();

router.get(
  "/",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  confirmDiagnosesController.getConfirmDiagnoses,
);

export default router;
