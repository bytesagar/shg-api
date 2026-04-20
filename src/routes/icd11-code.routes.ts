import { Router } from "express";
import { Icd11CodeController } from "../modules/icd-11/icd11-code.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();
const controller = new Icd11CodeController();

/**
 * @openapi
 * /icd11-codes:
 *   get:
 *     tags:
 *       - Reference
 *     summary: List or search ICD-11 MMS codes (Nepal common list)
 *     operationId: listIcd11Codes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Optional substring match on code or title
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Exact category filter
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 30
 *     responses:
 *       200:
 *         description: Paginated ICD-11 codes
 *       401:
 *         description: Unauthorized
 */
router.get("/", authMiddleware, controller.listIcd11Codes);

export default router;
