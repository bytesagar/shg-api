import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import {
  CLINICAL_READ_ROLES,
  FACILITY_MANAGEMENT_ROLES,
} from "../constants/rbac";
import { HmisAnalyticsController } from "../modules/hmis-analytics/hmis-analytics.controller";

const router = Router();
const controller = new HmisAnalyticsController();

router.get(
  "/indicators",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  controller.listIndicators,
);

router.get(
  "/indicators/:name",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  controller.getIndicator,
);

router.get(
  "/monthly-aggregate",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  controller.getMonthlyAggregate,
);

router.post(
  "/monthly-aggregate/recompute",
  authMiddleware,
  authorize([...FACILITY_MANAGEMENT_ROLES]),
  controller.recomputeMonthlyAggregate,
);

export default router;
