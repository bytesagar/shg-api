import { Router } from "express";
import { PatientController } from "../modules/patients/patient.controller";
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
 *     parameters:
 *       - name: page
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - name: pageSize
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 30
 *       - name: searchString
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: Search across patientId, phoneNumber, firstName, lastName, and name.
 *       - name: service
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by service (case-insensitive exact match).
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
