import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { EncounterController } from "../modules/encounters/encounter.controller";
import { CLINICAL_READ_ROLES } from "../constants/rbac";

const router = Router();
const encounterController = new EncounterController();

router.get(
  "/",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  encounterController.getEncounters,
);
router.get(
  "/:id",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  encounterController.getEncounter,
);

export default router;
