import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authorizePermission } from "../middlewares/authorize.middleware";
import { ImmunizationController } from "../modules/immunizations/immunization.controller";

const router = Router();
const controller = new ImmunizationController();

router.get(
  "/vaccines",
  authMiddleware,
  authorizePermission("immunization:read"),
  controller.listVaccineCatalog,
);

// AEFI
router.post(
  "/aefi-events",
  authMiddleware,
  authorizePermission("immunization:create"),
  controller.recordAefi,
);
router.get(
  "/aefi-events",
  authMiddleware,
  authorizePermission("immunization:read"),
  controller.listAefiEvents,
);

// Campaigns
router.post(
  "/campaigns",
  authMiddleware,
  authorizePermission("immunization:create"),
  controller.createCampaign,
);
router.get(
  "/campaigns",
  authMiddleware,
  authorizePermission("immunization:read"),
  controller.listCampaigns,
);

// HPV sessions
router.post(
  "/hpv-sessions",
  authMiddleware,
  authorizePermission("immunization:create"),
  controller.createHpvSession,
);
router.get(
  "/hpv-sessions",
  authMiddleware,
  authorizePermission("immunization:read"),
  controller.listHpvSessions,
);

export default router;
