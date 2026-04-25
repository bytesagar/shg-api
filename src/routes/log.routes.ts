import { Router } from "express";
import { LogController } from "../modules/logs/log.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { ADMIN_ONLY_ROLES } from "../constants/rbac";

const router = Router();
const logController = new LogController();

/**
 * @openapi
 * /logs:
 *   get:
 *     tags:
 *       - Logs
 *     summary: Get system logs
 *     operationId: getSystemLogs
 *     description: Retrieve system logs with pagination. Requires admin privileges.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination.
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 30
 *         description: Number of logs per page.
 *     responses:
 *       200:
 *         description: Successfully retrieved logs.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 */
router.get(
  "/",
  authMiddleware,
  authorize([...ADMIN_ONLY_ROLES]),
  logController.getLogs,
);

export default router;
