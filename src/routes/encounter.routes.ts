import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { EncounterController } from "../controllers/encounter.controller";

const router = Router();
const encounterController = new EncounterController();

/**
 * @openapi
 * /encounters:
 *   post:
 *     tags:
 *       - Encounters
 *     summary: Create a patient visit (encounter)
 *     operationId: createEncounter
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - reason
 *             properties:
 *               patientId:
 *                 type: string
 *                 format: uuid
 *               date:
 *                 type: string
 *                 format: date-time
 *               reason:
 *                 type: string
 *               service:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [planned, arrived, in_progress, finished, cancelled]
 *               doctorId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Encounter created
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Patient not found
 */
router.post("/", authMiddleware, encounterController.createEncounter);

/**
 * @openapi
 * /encounters/{id}:
 *   get:
 *     tags:
 *       - Encounters
 *     summary: Get encounter by ID
 *     operationId: getEncounterById
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
 *         description: Encounter retrieved
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Encounter not found
 */
router.get("/:id", authMiddleware, encounterController.getEncounter);

/**
 * @openapi
 * /encounters/{id}/vitals:
 *   post:
 *     tags:
 *       - Encounters
 *     summary: Record vitals for an encounter
 *     operationId: addVitals
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [temperature, respiratoryRate, spo2]
 *             properties:
 *               systolic:
 *                 type: integer
 *               diastolic:
 *                 type: integer
 *               temperature:
 *                 type: number
 *               pulse:
 *                 type: integer
 *               respiratoryRate:
 *                 type: integer
 *               spo2:
 *                 type: integer
 *               weight:
 *                 type: number
 *               height:
 *                 type: number
 *     responses:
 *       201:
 *         description: Vitals recorded
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Encounter not found
 */
router.post("/:id/vitals", authMiddleware, encounterController.addVitals);

/**
 * @openapi
 * /encounters/{id}/histories:
 *   post:
 *     tags:
 *       - Encounters
 *     summary: Record client history for an encounter
 *     operationId: addHistory
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [medical, surgical, obGyn, medication, familyHistory, social]
 *             properties:
 *               medical:
 *                 type: string
 *               surgical:
 *                 type: string
 *               obGyn:
 *                 type: string
 *               medication:
 *                 type: string
 *               familyHistory:
 *                 type: string
 *               social:
 *                 type: string
 *               other:
 *                 type: string
 *     responses:
 *       201:
 *         description: History recorded
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Encounter not found
 */
router.post("/:id/histories", authMiddleware, encounterController.addHistory);

/**
 * @openapi
 * /encounters/{id}/complaints:
 *   post:
 *     tags:
 *       - Encounters
 *     summary: Record chief complaint for an encounter
 *     operationId: addComplaint
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, durationUnit, severity, description]
 *             properties:
 *               title:
 *                 type: string
 *               duration:
 *                 type: integer
 *               durationUnit:
 *                 type: string
 *                 enum: [hours, days, weeks, months, years]
 *               severity:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Complaint recorded
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Encounter not found
 */
router.post("/:id/complaints", authMiddleware, encounterController.addComplaint);

/**
 * @openapi
 * /encounters/{id}/physical-examinations:
 *   post:
 *     tags:
 *       - Encounters
 *     summary: Record physical examination for an encounter
 *     operationId: addPhysicalExamination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - generalCondition
 *               - chest
 *               - cvs
 *               - cns
 *               - perabdominal
 *               - localExamination
 *             properties:
 *               generalCondition:
 *                 type: string
 *               chest:
 *                 type: string
 *               cvs:
 *                 type: string
 *               cns:
 *                 type: string
 *               perabdominal:
 *                 type: string
 *               localExamination:
 *                 type: string
 *     responses:
 *       201:
 *         description: Physical examination recorded
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Encounter not found
 */
router.post(
  "/:id/physical-examinations",
  authMiddleware,
  encounterController.addPhysicalExamination,
);

/**
 * @openapi
 * /encounters/{id}/provisional-diagnoses:
 *   post:
 *     tags:
 *       - Encounters
 *     summary: Record provisional diagnosis for an encounter
 *     operationId: addProvisionalDiagnosis
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [description]
 *             properties:
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Provisional diagnosis recorded
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Encounter not found
 */
router.post(
  "/:id/provisional-diagnoses",
  authMiddleware,
  encounterController.addProvisionalDiagnosis,
);

/**
 * @openapi
 * /encounters/{id}/confirm-diagnoses:
 *   post:
 *     tags:
 *       - Encounters
 *     summary: Record final diagnosis for an encounter
 *     operationId: addConfirmDiagnosis
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [description]
 *             properties:
 *               icdCode:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Final diagnosis recorded
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Encounter not found
 */
router.post(
  "/:id/confirm-diagnoses",
  authMiddleware,
  encounterController.addConfirmDiagnosis,
);

/**
 * @openapi
 * /encounters/{id}/tests:
 *   post:
 *     tags:
 *       - Encounters
 *     summary: Record lab/radiology test for an encounter
 *     operationId: addTest
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [testName, testCategory]
 *             properties:
 *               testName:
 *                 type: string
 *               testResult:
 *                 type: string
 *               testCategory:
 *                 type: string
 *                 enum: [lab, imaging, other]
 *     responses:
 *       201:
 *         description: Test recorded
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Encounter not found
 */
router.post("/:id/tests", authMiddleware, encounterController.addTest);

/**
 * @openapi
 * /encounters/{id}/treatments:
 *   post:
 *     tags:
 *       - Encounters
 *     summary: Record treatment for an encounter
 *     operationId: addTreatment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               medicalAdvise:
 *                 type: string
 *               followUpText:
 *                 type: string
 *               followUpDate:
 *                 type: string
 *                 format: date-time
 *               refer:
 *                 type: string
 *               referReason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Treatment recorded
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Encounter not found
 */
router.post("/:id/treatments", authMiddleware, encounterController.addTreatment);

/**
 * @openapi
 * /encounters/{id}/medications:
 *   post:
 *     tags:
 *       - Encounters
 *     summary: Record medication for an encounter
 *     operationId: addMedication
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *               medicineName:
 *                 type: string
 *               dosage:
 *                 type: string
 *               times:
 *                 type: string
 *               route:
 *                 type: string
 *               beforeAfter:
 *                 type: string
 *               duration:
 *                 type: string
 *               specialNotes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Medication recorded
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Encounter not found
 */
router.post("/:id/medications", authMiddleware, encounterController.addMedication);

/**
 * @openapi
 * /encounters/{id}/documents:
 *   post:
 *     tags:
 *       - Encounters
 *     summary: Record a document/report for an encounter
 *     operationId: addDocument
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               path:
 *                 type: string
 *     responses:
 *       201:
 *         description: Document recorded
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Encounter not found
 */
router.post("/:id/documents", authMiddleware, encounterController.addDocument);

export default router;
