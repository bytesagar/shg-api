import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authorizePermission } from "../middlewares/authorize.middleware";
import { GrowthController } from "../modules/growths/growths.controller";

const router = Router();
const controller = new GrowthController();

router.use(authMiddleware);

router.get("/", authorizePermission("growth:read"), controller.list);
router.post(
  "/:patientId",
  authorizePermission("growth:create"),
  controller.create,
);
router.patch(
  "/:id",
  authorizePermission("growth:update"),
  controller.update,
);

export default router;
