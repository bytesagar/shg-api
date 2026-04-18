import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { TelehealthController } from "../controllers/telehealth.controller";

const router = Router();
const telehealthController = new TelehealthController();

/**
 * @openapi
 * /telehealth/appointments:
 *   post:
 *     tags:
 *       - Telehealth
 *     summary: Book a telehealth consultation
 *     operationId: bookTelehealthAppointment
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [patientId, doctorId, scheduledAt]
 *             properties:
 *               patientId:
 *                 type: string
 *                 format: uuid
 *               doctorId:
 *                 type: string
 *                 format: uuid
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: >
 *           Appointment booked. The `meeting` object includes `provider` and `room` (Jitsi room name) only.
 *           Do not expect join URLs here; call POST `/telehealth/appointments/{id}/join` with `as=doctor` or `as=patient`
 *           to receive a short-lived signed `joinUrl`.
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Patient or doctor not found
 */
router.post(
  "/appointments",
  authMiddleware,
  telehealthController.bookAppointment,
);

/**
 * @openapi
 * /telehealth/appointments/{id}/join:
 *   post:
 *     tags:
 *       - Telehealth
 *     summary: Create a short-lived signed JaaS join URL (JWT) for a doctor or patient
 *     operationId: getTelehealthJoinLink
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: as
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           enum: [doctor, patient]
 *     responses:
 *       200:
 *         description: Join URL with embedded JWT (typically 15 minutes TTL; override via JITSI_JOIN_JWT_EXPIRES_IN)
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Appointment or participant not found
 */
router.post(
  "/appointments/:id/join",
  authMiddleware,
  telehealthController.getJoinLink,
);

export default router;
