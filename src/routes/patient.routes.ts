import { Router } from "express";
import { PatientController } from "../controllers/patient.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();
const patientController = new PatientController();

/**
 * @openapi
 * /patients:
 *   post:
 *     tags:
 *       - Patients
 *     summary: Register a new patient
 *     operationId: createPatient
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - gender
 *               - age
 *               - caste
 *               - province
 *               - district
 *               - palika
 *               - ward
 *               - phoneNumber
 *               - service
 *               - facilityId
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               middleName:
 *                 type: string
 *               caste:
 *                 type: string
 *                 enum: [dalit, janajati, madhesi, muslim, brahmin_chhetri, other]
 *               age:
 *                 type: integer
 *               ageUnit:
 *                 type: string
 *                 enum: [years, months, days]
 *               dob:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *               province:
 *                 type: string
 *               district:
 *                 type: string
 *               palika:
 *                 type: string
 *               ward:
 *                 type: integer
 *               phoneNumber:
 *                 type: string
 *               service:
 *                 type: string
 *               facilityId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Patient created
 *       400:
 *         description: Validation failed
 */
router.post("/", authMiddleware, patientController.createPatient);

/**
 * @openapi
 * /patients:
 *   get:
 *     tags:
 *       - Patients
 *     summary: Get all patients
 *     operationId: getPatients
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of patients
 */
router.get("/", authMiddleware, patientController.getPatients);

/**
 * @openapi
 * /patients/{id}:
 *   get:
 *     tags:
 *       - Patients
 *     summary: Get patient by ID
 *     operationId: getPatientById
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Patient details
 *       404:
 *         description: Patient not found
 */
router.get("/:id", authMiddleware, patientController.getPatient);

export default router;
