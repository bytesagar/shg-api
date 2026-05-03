import { Router } from "express";
import userRoutes from "./user.routes";
import roleRoutes from "./roles.routes";
import authRoutes from "./auth.routes";
import logRoutes from "./log.routes";
import patientRoutes from "./patient.routes";
import healthFacilityRoutes from "./health-facility.routes";
import visitRoutes from "./visit.routes";
import encounterRoutes from "./encounter.routes";
import telehealthRoutes from "./telehealth.routes";
import familyPlanningRoutes from "./family-planning.routes";
import rosterRoutes from "./roster.routes";
import attachmentRoutes from "./attachment.routes";
import icd11CodeRoutes from "./icd11-code.routes";
import jaasWebhookRoutes from "./jaas-webhook.routes";
import fhirRoutes from "./fhir.routes";
import vitalsRoutes from "./vitals.routes";
import maternalHealthRoutes from "./maternal-health.routes";
import { authMiddleware } from "../middlewares/auth.middleware";
import { AuthController } from "../modules/auth/auth.controller";

const router = Router();
const authController = new AuthController();

/**
 * @openapi
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Health check
 *     operationId: healthCheck
 *     description: Returns the health status of the API.
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

router.use("/auth", authRoutes);
router.get("/me/facilities", authMiddleware, authController.myFacilities);
router.use("/users", userRoutes);
router.use("/roles", roleRoutes);
router.use("/logs", logRoutes);
router.use("/patients", patientRoutes);
router.use("/health-facilities", healthFacilityRoutes);
router.use("/facilities", healthFacilityRoutes);
router.use("/visits", visitRoutes);
router.use("/encounters", encounterRoutes);
router.use("/telehealth", telehealthRoutes);
router.use("/family-plannings", familyPlanningRoutes);
router.use("/rosters", rosterRoutes);
router.use("/attachments", attachmentRoutes);
router.use("/icd11-codes", icd11CodeRoutes);
router.use("/webhooks/jaas", jaasWebhookRoutes);
router.use("/fhir", fhirRoutes);
router.use("/vitals", vitalsRoutes);
router.use("/maternal-health", maternalHealthRoutes);

export default router;
