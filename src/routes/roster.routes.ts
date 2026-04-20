import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { RosterController } from "../modules/rosters/roster.controller";

const router = Router();
const rosterController = new RosterController();

/**
 * @openapi
 * /rosters/available-users:
 *   get:
 *     tags:
 *       - Rosters
 *     summary: List users with an active roster on a calendar day
 *     operationId: getRosterAvailableUsers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: date
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: UTC calendar day (YYYY-MM-DD)
 *       - name: service
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *       - name: atTime
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter to slots covering this time (HH:mm, UTC)
 *     responses:
 *       200:
 *         description: Providers and roster slots
 */
router.get(
  "/available-users",
  authMiddleware,
  rosterController.getAvailableUsers,
);

/**
 * @openapi
 * /rosters/assignable-users:
 *   get:
 *     tags:
 *       - Rosters
 *     summary: List users who can be assigned to a roster at this facility (paginated)
 *     operationId: listRosterAssignableUsers
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/assignable-users",
  authMiddleware,
  authorize(["admin", "facility"]),
  rosterController.listAssignableUsers,
);

/**
 * @openapi
 * /rosters:
 *   get:
 *     tags:
 *       - Rosters
 *     summary: List roster shifts for the facility (optional date range)
 *     operationId: listRosters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: fromDate
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Inclusive start (YYYY-MM-DD). Omit with toDate to list all dates.
 *       - name: toDate
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Inclusive end (YYYY-MM-DD). Omit with fromDate to list all dates.
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - name: pageSize
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *       - name: userId
 *         in: query
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: service
 *         in: query
 *         schema:
 *           type: string
 */
router.get("/", authMiddleware, rosterController.listRosters);

/**
 * @openapi
 * /rosters:
 *   post:
 *     tags:
 *       - Rosters
 *     summary: Create a roster shift
 *     operationId: createRoster
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/",
  authMiddleware,
  authorize(["admin", "facility"]),
  rosterController.createRoster,
);

/**
 * @openapi
 * /rosters/batch:
 *   post:
 *     tags:
 *       - Rosters
 *     summary: Create many roster shifts for one user (single form submit)
 *     operationId: createRosterBatch
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/batch",
  authMiddleware,
  authorize(["admin", "facility"]),
  rosterController.createRosterBatch,
);

/**
 * @openapi
 * /rosters/{id}:
 *   get:
 *     tags:
 *       - Rosters
 *     summary: Get roster shift by id
 *     operationId: getRosterById
 *     security:
 *       - bearerAuth: []
 */
router.get("/:id", authMiddleware, rosterController.getRoster);

/**
 * @openapi
 * /rosters/{id}:
 *   patch:
 *     tags:
 *       - Rosters
 *     summary: Update a roster shift
 *     operationId: updateRoster
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  "/:id",
  authMiddleware,
  authorize(["admin", "facility"]),
  rosterController.updateRoster,
);

/**
 * @openapi
 * /rosters/{id}:
 *   delete:
 *     tags:
 *       - Rosters
 *     summary: Soft-delete a roster shift
 *     operationId: deleteRoster
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  "/:id",
  authMiddleware,
  authorize(["admin", "facility"]),
  rosterController.deleteRoster,
);

export default router;
