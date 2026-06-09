import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { patientScopeFromQuery } from "../middlewares/patient-scope.middleware";
import { CLINICAL_READ_ROLES } from "../constants/rbac";
import { TestsController } from "../modules/tests/tests.controller";

const router = Router();
const testsController = new TestsController();

router.get(
  "/",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  patientScopeFromQuery(),
  testsController.getTests,
);

export default router;
