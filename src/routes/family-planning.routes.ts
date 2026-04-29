import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { FamilyPlanningController } from "../modules/clinical-visits/family-planning.controller";
import { CLINICAL_READ_ROLES, COMMUNITY_WRITE_ROLES } from "../constants/rbac";

const router = Router();
const familyPlanningController = new FamilyPlanningController();

router.get(
  "/",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  familyPlanningController.listFamilyPlannings,
);

router.get(
  "/:id",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  familyPlanningController.getFamilyPlanning,
);

/**
 * @openapi
 * /family-plannings:
 *   post:
 *     tags:
 *       - Family Planning
 *     summary: Create a family planning record
 *     operationId: createFamilyPlanning
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 required: [serviceType, patientId, serviceDate, details]
 *                 properties:
 *                   serviceType:
 *                     type: string
 *                     enum: [new, follow_up]
 *                   patientId:
 *                     type: string
 *                     format: uuid
 *                   serviceDate:
 *                     type: string
 *                     format: date-time
 *                   serviceProviderId:
 *                     type: string
 *                     format: uuid
 *                   details:
 *                     type: object
 *                     required: [devicePlanned, deviceUsed]
 *                     properties:
 *                       lastMenstrualPeriod:
 *                         type: string
 *                         format: date-time
 *                       devicePlanned:
 *                         type: string
 *                         enum: [condom, pills, depo, iucd, implant, vasectomy, minilap, none]
 *                       deviceUsed:
 *                         type: string
 *                         enum: [condom, pills, depo, iucd, implant, vasectomy, minilap, none]
 *                       isActive:
 *                         type: boolean
 *                       deviceNotUsedReason:
 *                         type: string
 *                       usageTimePeriod:
 *                         type: string
 *                         enum: [within_45_days, after_45_days]
 *                       usageDate:
 *                         type: string
 *                         format: date-time
 *                       followUpDate:
 *                         type: string
 *                         format: date-time
 *                       previous:
 *                         type: object
 *                         properties:
 *                           previousDevice:
 *                             type: string
 *                             enum: [condom, pills, depo, iucd, implant, vasectomy, minilap, none]
 *                           continueSameDevice:
 *                             type: boolean
 *                           discontinueReason:
 *                             type: string
 *                           discontinueReasonOther:
 *                             type: string
 *                       hormonalDetails:
 *                         type: object
 *                         required:
 *                           - swellingLegOrBreathShortness
 *                           - painSwellingLegPregnancy
 *                           - regularMenstrualBleeding
 *                           - menstruationBleedingAmount
 *                           - bleedingBetweenPeriods
 *                           - jaundice
 *                           - diabetes
 *                           - severeHeadache
 *                           - lumpOrSwellingBreast
 *                         properties:
 *                           swellingLegOrBreathShortness:
 *                             type: boolean
 *                           painSwellingLegPregnancy:
 *                             type: boolean
 *                           regularMenstrualBleeding:
 *                             type: boolean
 *                           menstruationBleedingAmount:
 *                             type: boolean
 *                           bleedingBetweenPeriods:
 *                             type: boolean
 *                           jaundice:
 *                             type: boolean
 *                           diabetes:
 *                             type: boolean
 *                           severeHeadache:
 *                             type: boolean
 *                           lumpOrSwellingBreast:
 *                             type: boolean
 *               - type: object
 *                 required: [serviceType, patientId, serviceDate, details]
 *                 properties:
 *                   serviceType:
 *                     type: string
 *                     enum: [removal]
 *                   patientId:
 *                     type: string
 *                     format: uuid
 *                   serviceDate:
 *                     type: string
 *                     format: date-time
 *                   serviceProviderId:
 *                     type: string
 *                     format: uuid
 *                   details:
 *                     type: object
 *                     required: [removalDate]
 *                     properties:
 *                       lastMenstrualPeriod:
 *                         type: string
 *                         format: date-time
 *                       removalDate:
 *                         type: string
 *                         format: date-time
 *                       placeOfFpDeviceUsed:
 *                         type: string
 *                       otherHealthFacilityName:
 *                         type: string
 *                       removalReason:
 *                         type: string
 *                       previous:
 *                         type: object
 *                         properties:
 *                           previousDevice:
 *                             type: string
 *                             enum: [condom, pills, depo, iucd, implant, vasectomy, minilap, none]
 *                           continueSameDevice:
 *                             type: boolean
 *                           discontinueReason:
 *                             type: string
 *                           discontinueReasonOther:
 *                             type: string
 *     responses:
 *       201:
 *         description: Family planning created
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
  authorize([...COMMUNITY_WRITE_ROLES]),
  familyPlanningController.createFamilyPlanning,
);

export default router;
