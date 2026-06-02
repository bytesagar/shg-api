import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { DashboardController } from "../modules/dashboard/dashboard.controller";
import { AUTHENTICATED_ROLES } from "../constants/rbac";

const router = Router();
const dashboardController = new DashboardController();

/**
 * @openapi
 * /dashboard/summary:
 *   get:
 *     tags:
 *       - Dashboard
 *     summary: Facility dashboard summary (glance counts + delivery alerts)
 *     operationId: getDashboardSummary
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard summary retrieved
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/summary",
  authMiddleware,
  authorize([...AUTHENTICATED_ROLES]),
  dashboardController.getSummary,
);

export default router;
