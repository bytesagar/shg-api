import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import {
  AUTHENTICATED_ROLES,
  CLINICAL_READ_ROLES,
  CLINICAL_WRITE_ROLES,
} from "../constants/rbac";
import { ImnciVisitController } from "../modules/imnci/imnci-visit.controller";
import { ImnciFollowUpController } from "../modules/imnci/imnci-followup.controller";
import { ImnciReferenceController } from "../modules/imnci/imnci-reference.controller";
import { ImnciReportsController } from "../modules/imnci/imnci-reports.controller";
import { ImnciRecordController } from "../modules/imnci-records/imnci-record.controller";

const router = Router();
const visit = new ImnciVisitController();
const followUp = new ImnciFollowUpController();
const reference = new ImnciReferenceController();
const reports = new ImnciReportsController();
const record = new ImnciRecordController();

router.use(authMiddleware);

// Reference (read-only, any authenticated user)
router.get(
  "/reference/chart-booklets/active",
  authorize([...AUTHENTICATED_ROLES]),
  reference.getActiveBooklet,
);
router.get(
  "/reference/chart-booklets/:id",
  authorize([...AUTHENTICATED_ROLES]),
  reference.getBooklet,
);
router.get(
  "/reference/formulary/:bookletId",
  authorize([...AUTHENTICATED_ROLES]),
  reference.getFormulary,
);

// HMIS reports (clinical read; admin can cross-facility via ?facilityId=)
router.get(
  "/reports/monthly-classifications",
  authorize([...CLINICAL_READ_ROLES]),
  reports.monthlyClassifications,
);
router.get(
  "/reports/visits-summary",
  authorize([...CLINICAL_READ_ROLES]),
  reports.visitsSummary,
);
router.get(
  "/reports/follow-ups-summary",
  authorize([...CLINICAL_READ_ROLES]),
  reports.followUpsSummary,
);
router.get(
  "/reports/commodities-dispensed",
  authorize([...CLINICAL_READ_ROLES]),
  reports.commoditiesDispensed,
);

// Follow-ups (clinical)
router.get(
  "/follow-ups",
  authorize([...CLINICAL_READ_ROLES]),
  followUp.list,
);
router.post(
  "/follow-ups/:id/complete",
  authorize([...CLINICAL_WRITE_ROLES]),
  followUp.complete,
);

// Visits (clinical)
router.get("/visits", authorize([...CLINICAL_READ_ROLES]), visit.listVisits);
router.post("/visits", authorize([...CLINICAL_WRITE_ROLES]), visit.startVisit);
router.get("/visits/:id", authorize([...CLINICAL_READ_ROLES]), visit.getVisit);
router.patch(
  "/visits/:id/answers",
  authorize([...CLINICAL_WRITE_ROLES]),
  visit.saveAnswers,
);
router.post(
  "/visits/:id/classify",
  authorize([...CLINICAL_WRITE_ROLES]),
  visit.classify,
);
router.post(
  "/visits/:id/treatment-plan/confirm",
  authorize([...CLINICAL_WRITE_ROLES]),
  visit.confirmPlan,
);
router.post(
  "/visits/:id/refer",
  authorize([...CLINICAL_WRITE_ROLES]),
  visit.refer,
);

// Records (offline-first IMNCI register archive). The frontend's Dexie
// outbox upserts here by its client-generated id — POST is idempotent.
router.get("/records", authorize([...CLINICAL_READ_ROLES]), record.list);
router.post("/records", authorize([...CLINICAL_WRITE_ROLES]), record.upsert);
router.get("/records/:id", authorize([...CLINICAL_READ_ROLES]), record.getById);
router.delete(
  "/records/:id",
  authorize([...CLINICAL_WRITE_ROLES]),
  record.remove,
);

export default router;
