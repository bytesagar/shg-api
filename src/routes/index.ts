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
import medicineRoutes from "./medicine.routes";
import fhirRoutes from "./fhir.routes";
import vitalsRoutes from "./vitals.routes";
import complaintsRoutes from "./complaints.routes";
import medicationsRoutes from "./medications.routes";
import confirmDiagnosesRoutes from "./confirm-diagnoses.routes";
import provisionalDiagnosesRoutes from "./provisional-diagnoses.routes";
import testsRoutes from "./tests.routes";
import treatmentsRoutes from "./treatments.routes";
import physicalExaminationsRoutes from "./physical-examinations.routes";
import historiesRoutes from "./histories.routes";
import searchRoutes from "./search.routes";
import maternalHealthRoutes from "./maternal-health.routes";
import { authMiddleware } from "../middlewares/auth.middleware";
import { AuthController } from "../modules/auth/auth.controller";
import referenceDataRoutes from "./reference-data.routes";
import imnciRoutes from "./imnci.routes";
import imnciFchvRoutes from "./imnci-fchv.routes";
import growthRoutes from "./growth.routes";
import notificationRoutes from "./notification.routes";
import pusherRoutes from "./pusher.routes";
import teleAuscultationRoutes from "./tele-auscultation.routes";
import analyticsRoutes from "./analytics.routes";
import hmisAnalyticsRoutes from "./hmis-analytics.routes";
import immunizationRoutes from "./immunization.routes";
import labTestRoutes from "./lab-test.routes";
import labOrderRoutes from "./lab-order.routes";
import dashboardRoutes from "./dashboard.routes";

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
router.use("/medicines", medicineRoutes);
router.use("/fhir", fhirRoutes);
router.use("/vitals", vitalsRoutes);
router.use("/complaints", complaintsRoutes);
router.use("/medications", medicationsRoutes);
router.use("/confirm-diagnoses", confirmDiagnosesRoutes);
router.use("/provisional-diagnoses", provisionalDiagnosesRoutes);
router.use("/tests", testsRoutes);
router.use("/treatments", treatmentsRoutes);
router.use("/physical-examinations", physicalExaminationsRoutes);
router.use("/histories", historiesRoutes);
router.use("/search", searchRoutes);
router.use("/maternal-health", maternalHealthRoutes);
router.use("/reference-data", referenceDataRoutes);
router.use("/imnci/fchv", imnciFchvRoutes);
router.use("/imnci", imnciRoutes);
router.use("/growths", growthRoutes);
router.use("/notifications", notificationRoutes);
router.use("/pusher", pusherRoutes);
router.use("/tele-auscultation", teleAuscultationRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/hmis-analytics", hmisAnalyticsRoutes);
router.use("/immunizations", immunizationRoutes);
router.use("/lab-tests", labTestRoutes);
router.use("/lab-orders", labOrderRoutes);
router.use("/dashboard", dashboardRoutes);

export default router;
