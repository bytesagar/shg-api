import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { CLINICAL_READ_ROLES } from "../constants/rbac";
import { HistoriesController } from "../modules/histories/histories.controller";

const router = Router();
const historiesController = new HistoriesController();

router.get(
  "/",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  historiesController.getHistories,
);

export default router;
