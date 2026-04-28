import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { CLINICAL_READ_ROLES } from "../constants/rbac";
import { VitalsController } from "../modules/vitals/vitals.controller";

const router = Router();
const vitalsController = new VitalsController();

router.get(
  "/",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  vitalsController.getVitals,
);

export default router;

