import { Router } from "express";
import userRoutes from "./user.routes";
import authRoutes from "./auth.routes";
import logRoutes from "./log.routes";
import patientRoutes from "./patient.routes";
import healthFacilityRoutes from "./health-facility.routes";
import visitRoutes from "./visit.routes";
import telehealthRoutes from "./telehealth.routes";
import familyPlanningRoutes from "./family-planning.routes";
import rosterRoutes from "./roster.routes";
import attachmentRoutes from "./attachment.routes";

const router = Router();

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
router.use("/users", userRoutes);
router.use("/logs", logRoutes);
router.use("/patients", patientRoutes);
router.use("/health-facilities", healthFacilityRoutes);
router.use("/visits", visitRoutes);
router.use("/telehealth", telehealthRoutes);
router.use("/family-plannings", familyPlanningRoutes);
router.use("/rosters", rosterRoutes);
router.use("/attachments", attachmentRoutes);

export default router;
