import { Router } from "express";
import { MedicineController } from "../modules/medicines/medicine.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { ADMIN_ONLY_ROLES, CLINICAL_READ_ROLES } from "../constants/rbac";

const router = Router();
const controller = new MedicineController();

/**
 * @openapi
 * /medicines:
 *   get:
 *     tags:
 *       - Medicine Registry
 *     summary: List or search the global medicine registry
 *     operationId: listMedicines
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Optional substring match on medicine name
 *       - in: query
 *         name: form
 *         schema: { type: string }
 *         description: Exact medicine form filter (e.g. TABLET)
 *       - in: query
 *         name: isDefault
 *         schema: { type: boolean }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 30 }
 *     responses:
 *       200: { description: Paginated medicines }
 *       401: { description: Unauthorized }
 *   post:
 *     tags:
 *       - Medicine Registry
 *     summary: Create a medicine registry entry (admin only)
 *     operationId: createMedicine
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201: { description: Created }
 *       403: { description: Forbidden }
 */
router.get(
  "/",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  controller.listMedicines,
);

router.post(
  "/",
  authMiddleware,
  authorize([...ADMIN_ONLY_ROLES]),
  controller.createMedicine,
);

/**
 * @openapi
 * /medicines/{id}:
 *   get:
 *     tags: [Medicine Registry]
 *     summary: Get a medicine by id
 *     operationId: getMedicine
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Medicine }
 *       404: { description: Not found }
 *   patch:
 *     tags: [Medicine Registry]
 *     summary: Update a medicine (admin only)
 *     operationId: updateMedicine
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Updated }
 *       403: { description: Forbidden }
 *   delete:
 *     tags: [Medicine Registry]
 *     summary: Soft-delete a medicine (admin only)
 *     operationId: deleteMedicine
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204: { description: Deleted }
 *       403: { description: Forbidden }
 */
router.get(
  "/:id",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  controller.getMedicine,
);

router.patch(
  "/:id",
  authMiddleware,
  authorize([...ADMIN_ONLY_ROLES]),
  controller.updateMedicine,
);

router.delete(
  "/:id",
  authMiddleware,
  authorize([...ADMIN_ONLY_ROLES]),
  controller.deleteMedicine,
);

export default router;
