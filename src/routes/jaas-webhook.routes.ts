import { Router } from "express";
import { jaasWebhookAuthMiddleware } from "../middlewares/jaas-webhook-auth.middleware";
import { JaasWebhookController } from "../controllers/jaas-webhook.controller";

const router = Router();
const controller = new JaasWebhookController();

/**
 * @openapi
 * /webhooks/jaas:
 *   post:
 *     tags:
 *       - Webhooks
 *     summary: JaaS (8x8) webhook for telehealth room lifecycle
 *     description: >
 *       Secured by `Authorization` matching `JITSI_WEBHOOK_SECRET` (see README).
 *       Configure in JaaS Developer Console with events ROOM_CREATED and ROOM_DESTROYED.
 *     operationId: jaasWebhook
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Acknowledged (including duplicates and skips)
 *       400:
 *         description: Invalid JSON body
 *       401:
 *         description: Missing or invalid Authorization
 */
router.post("/", jaasWebhookAuthMiddleware, controller.handleWebhook);

export default router;
