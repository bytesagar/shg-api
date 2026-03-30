import { Router } from "express";
import userRoutes from "./user.routes";
import authRoutes from "./auth.routes";
import logRoutes from "./log.routes";
import patientRoutes from "./patient.routes";

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

export default router;
