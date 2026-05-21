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

// ---- HMIS 2082 endpoints ----

router.post(
  "/pregnancies/:pregnancyId/previous-pregnancies",
  authMiddleware,
  authorize([...CLINICAL_WRITE_ROLES]),
  maternalHealthController.createPreviousPregnancies,
);

router.patch(
  "/pregnancies/:pregnancyId/screenings",
  authMiddleware,
  authorize([...CLINICAL_WRITE_ROLES]),
  maternalHealthController.patchScreening,
);

router.patch(
  "/pregnancies/:pregnancyId/td-doses",
  authMiddleware,
  authorize([...CLINICAL_WRITE_ROLES]),
  maternalHealthController.patchTdDoses,
);

router.post(
  "/pregnancies/:pregnancyId/complications",
  authMiddleware,
  authorize([...CLINICAL_WRITE_ROLES]),
  maternalHealthController.createComplication,
);

router.patch(
  "/pregnancies/:pregnancyId/aama-incentive",
  authMiddleware,
  authorize([...CLINICAL_WRITE_ROLES]),
  maternalHealthController.patchAamaIncentive,
);

router.post(
  "/maternal-deaths",
  authMiddleware,
  authorize([...CLINICAL_WRITE_ROLES]),
  maternalHealthController.createMaternalDeath,
);

router.post(
  "/newborn-deaths",
  authMiddleware,
  authorize([...CLINICAL_WRITE_ROLES]),
  maternalHealthController.createNewbornDeath,
);

router.post(
  "/safe-abortions",
  authMiddleware,
  authorize([...CLINICAL_WRITE_ROLES]),
  maternalHealthController.createSafeAbortion,
);

router.post(
  "/safe-abortions/:safeAbortionId/complications",
  authMiddleware,
  authorize([...CLINICAL_WRITE_ROLES]),
  maternalHealthController.createSafeAbortionComplication,
);

router.post(
  "/post-abortion-cares",
  authMiddleware,
  authorize([...CLINICAL_WRITE_ROLES]),
  maternalHealthController.createPostAbortionCare,
);

router.get(
  "/population-targets",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  maternalHealthController.listPopulationTargets,
);

router.post(
  "/population-targets",
  authMiddleware,
  authorize([...CLINICAL_WRITE_ROLES]),
  maternalHealthController.upsertPopulationTarget,
);

export default router;
