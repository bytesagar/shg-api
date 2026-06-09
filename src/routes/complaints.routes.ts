import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { patientScopeFromQuery } from "../middlewares/patient-scope.middleware";
import { CLINICAL_READ_ROLES } from "../constants/rbac";
import { ComplaintsController } from "../modules/complaints/complaints.controller";

const router = Router();
const complaintsController = new ComplaintsController();

router.get(
  "/",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  patientScopeFromQuery(),
  complaintsController.getComplaints,
);

export default router;
