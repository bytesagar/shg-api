import { Router } from "express";
import { LogController } from "../controllers/log.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";

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
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of logs per page.
 *     responses:
 *       200:
 *         description: Successfully retrieved logs.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 */
router.get("/", authMiddleware, authorize(["admin"]), logController.getLogs);

export default router;
