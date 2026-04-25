import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { VisitController } from "../modules/clinical-visits/visit.controller";
import {
  CLINICAL_READ_ROLES,
  CLINICAL_WRITE_ROLES,
} from "../constants/rbac";

const router = Router();
const visitController = new VisitController();


/**
 * @openapi
 * /visits:
 *   get:
 *     tags:
 *       - Visits
 *     summary: List visits
 *     operationId: listVisits
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Visits retrieved
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Visits not found
 */
router.get(
  "/",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  visitController.listVisits,
);

/**
 * @openapi
 * /visits:
 *   post:
 *     tags:
 *       - Visits
 *     summary: Create a patient visit
 *     operationId: createVisit
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
 *         description: Visit created
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Patient not found
 */
router.post(
  "/",
  authMiddleware,
  authorize([...CLINICAL_WRITE_ROLES]),
  visitController.createVisit,
);

/**
 * @openapi
 * /visits/{visitId}:
 *   get:
 *     tags:
 *       - Visits
 *     summary: Get visit by ID
 *     operationId: getVisitById
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: visitId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Visit retrieved
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Visit not found
 */
router.get(
  "/:visitId",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  visitController.getVisit,
);

/**
 * @openapi
 * /visits/{visitId}/vitals:
 *   post:
 *     tags:
 *       - Visits
 *     summary: Record vitals for a visit
 *     operationId: addVitals
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: visitId
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
 *         description: Visit not found
 */
router.post(
  "/:visitId/vitals",
  authMiddleware,
  authorize([...CLINICAL_WRITE_ROLES]),
  visitController.addVitals,
);

/**
 * @openapi
 * /visits/{visitId}/histories:
 *   post:
 *     tags:
 *       - Visits
 *     summary: Record client history for a visit
 *     operationId: addHistory
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: visitId
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
 *         description: Visit not found
 */
router.post(
  "/:visitId/histories",
  authMiddleware,
  authorize([...CLINICAL_WRITE_ROLES]),
  visitController.addHistory,
);

/**
 * @openapi
 * /visits/{visitId}/complaints:
 *   post:
 *     tags:
 *       - Visits
 *     summary: Record chief complaint for a visit
 *     operationId: addComplaint
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: visitId
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
 *         description: Visit not found
 */
router.post(
  "/:visitId/complaints",
  authMiddleware,
  authorize([...CLINICAL_WRITE_ROLES]),
  visitController.addComplaint,
);

/**
 * @openapi
 * /visits/{visitId}/physical-examinations:
 *   post:
 *     tags:
 *       - Visits
 *     summary: Record physical examination for a visit
 *     operationId: addPhysicalExamination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: visitId
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
 *         description: Visit not found
 */
router.post(
  "/:visitId/physical-examinations",
  authMiddleware,
  authorize([...CLINICAL_WRITE_ROLES]),
  visitController.addPhysicalExamination,
);

/**
 * @openapi
 * /visits/{visitId}/provisional-diagnoses:
 *   post:
 *     tags:
 *       - Visits
 *     summary: Record provisional diagnosis for a visit
 *     operationId: addProvisionalDiagnosis
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: visitId
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
 *         description: Visit not found
 */
router.post(
  "/:visitId/provisional-diagnoses",
  authMiddleware,
  authorize([...CLINICAL_WRITE_ROLES]),
  visitController.addProvisionalDiagnosis,
);

/**
 * @openapi
 * /visits/{visitId}/confirm-diagnoses:
 *   post:
 *     tags:
 *       - Visits
 *     summary: Record final diagnosis for a visit
 *     operationId: addConfirmDiagnosis
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: visitId
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
 *         description: Visit not found
 */
router.post(
  "/:visitId/confirm-diagnoses",
  authMiddleware,
  authorize([...CLINICAL_WRITE_ROLES]),
  visitController.addConfirmDiagnosis,
);

/**
 * @openapi
 * /visits/{visitId}/tests:
 *   post:
 *     tags:
 *       - Visits
 *     summary: Record lab/radiology test for a visit
 *     operationId: addTest
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: visitId
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
 *         description: Visit not found
 */
router.post(
  "/:visitId/tests",
  authMiddleware,
  authorize([...CLINICAL_WRITE_ROLES]),
  visitController.addTest,
);

/**
 * @openapi
 * /visits/{visitId}/treatments:
 *   post:
 *     tags:
 *       - Visits
 *     summary: Record treatment for a visit
 *     operationId: addTreatment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: visitId
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
 *         description: Visit not found
 */
router.post(
  "/:visitId/treatments",
  authMiddleware,
  authorize([...CLINICAL_WRITE_ROLES]),
  visitController.addTreatment,
);

/**
 * @openapi
 * /visits/{visitId}/medications:
 *   post:
 *     tags:
 *       - Visits
 *     summary: Record medication for a visit
 *     operationId: addMedication
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: visitId
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
 *         description: Visit not found
 */
router.post(
  "/:visitId/medications",
  authMiddleware,
  authorize([...CLINICAL_WRITE_ROLES]),
  visitController.addMedication,
);

export default router;
