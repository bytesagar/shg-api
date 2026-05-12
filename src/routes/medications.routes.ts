import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { CLINICAL_READ_ROLES } from "../constants/rbac";
import { MedicationsController } from "../modules/medications/medications.controller";

const router = Router();
const medicationsController = new MedicationsController();

router.get(
  "/",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  medicationsController.getMedications,
);

export default router;
