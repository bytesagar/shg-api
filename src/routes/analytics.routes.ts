import { Router } from "express";
import { AnalyticsController } from "../modules/analytics/analytics.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { CLINICAL_READ_ROLES } from "../constants/rbac";

const router = Router();
const controller = new AnalyticsController();

/**
 * @openapi
 * /analytics:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Dispatch analytics queries by method
 *     description: |
 *       Single ehmis-style endpoint. The `method` query param selects which
 *       analytics view to compute; per-method extras (`limit`, etc.) live
 *       alongside.
 *
 *       **Scope resolution via `facilityId`**:
 *       - omitted → defaults to the caller's `req.context.facilityId`
 *         (admin's `x-facility-id` header still applies for session-level
 *         switching).
 *       - `facilityId=<uuid>` → admin can pick any facility per-request without
 *         changing their session header. Non-admin must match their own.
 *       - `facilityId=all` → admin-only. Drops the facility filter so the query
 *         aggregates across every facility. Non-admin → 403.
 *
 *       Methods marked admin-only (`FACILITY_LEADERBOARD`, `SYSTEM_TOTALS`)
 *       require `facilityId=all`.
 *     operationId: getAnalytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: method
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           enum: [TOTAL_PATIENTS, TOTAL_OPD, TOTAL_IMMUNIZATION, TOTAL_MATERNAL, SERVICE_WISE_REFERRALS, SECTOR_WISE_REFERRALS, TELEHEALTH_REQUESTS_TOTAL, TELEHEALTH_REQUESTS_OPD, TELEHEALTH_REQUESTS_MATERNAL, TELEHEALTH_REQUESTS_CHILD, OPD_FOLLOW_UP, MORBIDITY_TREND, DEMOGRAPHICS_BY_GENDER, PATIENTS_BY_ETHNICITY, PATIENTS_BY_MUNICIPALITY, PATIENTS_BY_FACILITY, TOP_DISEASES, AGE_GENDER_DISTRIBUTION, CHART_DATA_FOR_MALE_AND_FEMALE_BY_AGE_RANGE, VISITS_DAILY_TREND, FACILITY_LEADERBOARD, SYSTEM_TOTALS]
 *       - name: fromDate
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-04-19"
 *         description: Calendar date in `YYYY-MM-DD` (UTC). Inclusive lower bound.
 *       - name: toDate
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-05-18"
 *         description: |
 *           Calendar date in `YYYY-MM-DD` (UTC). **Inclusive** upper bound —
 *           the entire day is covered. `fromDate == toDate` yields a
 *           single-day window. Equivalent to `[fromDate, toDate + 1 day)`
 *           internally.
 *       - name: facilityId
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: |
 *           UUID of a specific facility, or the literal `all` for system-wide
 *           aggregates (admin only).
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Used by MORBIDITY_TREND (default 3) and TOP_DISEASES (default 10).
 *     responses:
 *       200:
 *         description: Analytics payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     method:
 *                       type: string
 *                     range:
 *                       type: object
 *                       properties:
 *                         from: { type: string, format: date-time }
 *                         to: { type: string, format: date-time }
 *                     scope:
 *                       type: string
 *                       enum: [facility, all]
 *                     facilityId:
 *                       type: string
 *                       nullable: true
 *                     result:
 *                       description: Method-specific shape.
 *       400:
 *         description: Bad request (unknown method, missing/invalid dates, etc.)
 *       403:
 *         description: Forbidden (cross-facility access denied or admin-only method)
 */
router.get(
  "/",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  controller.handle,
);

export default router;
