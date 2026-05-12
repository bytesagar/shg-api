import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { CLINICAL_READ_ROLES } from "../constants/rbac";
import { TreatmentsController } from "../modules/treatments/treatments.controller";

const router = Router();
const treatmentsController = new TreatmentsController();

router.get(
  "/",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  treatmentsController.getTreatments,
);

export default router;
