import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { CLINICAL_READ_ROLES } from "../constants/rbac";
import { ProvisionalDiagnosesController } from "../modules/provisional-diagnoses/provisional-diagnoses.controller";

const router = Router();
const provisionalDiagnosesController = new ProvisionalDiagnosesController();

router.get(
  "/",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  provisionalDiagnosesController.getProvisionalDiagnoses,
);

export default router;
