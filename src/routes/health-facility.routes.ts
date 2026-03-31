import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { HealthFacilityController } from "../controllers/health-facility.controller";

const router = Router();
const healthFacilityController = new HealthFacilityController();

/**
 * @openapi
 * /health-facilities:
 *   get:
 *     tags:
 *       - Health Facilities
 *     summary: Get health facilities
 *     operationId: getHealthFacilities
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: pageSize
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 30
 *       - name: searchString
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *       - name: municipalityId
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Health facilities retrieved
 *       401:
 *         description: Unauthorized
 */
router.get("/", authMiddleware, healthFacilityController.getHealthFacilities);

/**
 * @openapi
 * /health-facilities:
 *   post:
 *     tags:
 *       - Health Facilities
 *     summary: Create a health facility
 *     operationId: createHealthFacility
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - address
 *               - phone
 *               - email
 *               - ward
 *               - palika
 *               - district
 *               - province
 *               - inchargeName
 *             properties:
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               ward:
 *                 type: string
 *               palika:
 *                 type: string
 *               district:
 *                 type: string
 *               province:
 *                 type: string
 *               provinceId:
 *                 type: string
 *                 format: uuid
 *               districtId:
 *                 type: string
 *                 format: uuid
 *               municipalityId:
 *                 type: string
 *                 format: uuid
 *               inchargeName:
 *                 type: string
 *               hfCode:
 *                 type: string
 *               authorityLevel:
 *                 type: string
 *               authority:
 *                 type: string
 *               ownership:
 *                 type: string
 *               facilityType:
 *                 type: string
 *     responses:
 *       201:
 *         description: Health facility created
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 */
router.post("/", authMiddleware, healthFacilityController.createHealthFacility);

export default router;
