import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { EncounterController } from "../modules/encounters/encounter.controller";

const router = Router();
const encounterController = new EncounterController();

router.get("/", authMiddleware, encounterController.getEncounters);
router.get("/:id", authMiddleware, encounterController.getEncounter);

export default router;
