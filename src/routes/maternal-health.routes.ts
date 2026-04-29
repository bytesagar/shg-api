import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { CLINICAL_READ_ROLES, CLINICAL_WRITE_ROLES } from "../constants/rbac";
import { MaternalHealthController } from "../modules/maternal-health/maternal-health.controller";

const router = Router();
const maternalHealthController = new MaternalHealthController();

router.post(
  "/visits/:visitId/pregnancies",
  authMiddleware,
  authorize([...CLINICAL_WRITE_ROLES]),
  maternalHealthController.createPregnancy,
);
router.get(
  "/pregnancies",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  maternalHealthController.listPregnancies,
);
router.get(
  "/pregnancies/:id",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  maternalHealthController.getPregnancy,
);

router.post(
  "/pregnancies/:pregnancyId/antenatal-cares",
  authMiddleware,
  authorize([...CLINICAL_WRITE_ROLES]),
  maternalHealthController.createAntenatalCare,
);
router.get(
  "/antenatal-cares",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  maternalHealthController.listAntenatalCares,
);

router.post(
  "/pregnancies/:pregnancyId/deliveries",
  authMiddleware,
  authorize([...CLINICAL_WRITE_ROLES]),
  maternalHealthController.createDelivery,
);
router.get(
  "/deliveries",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  maternalHealthController.listDeliveries,
);

router.post(
  "/pregnancies/:pregnancyId/postnatal-cares",
  authMiddleware,
  authorize([...CLINICAL_WRITE_ROLES]),
  maternalHealthController.createPostnatalCare,
);
router.get(
  "/postnatal-cares",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  maternalHealthController.listPostnatalCares,
);

export default router;
