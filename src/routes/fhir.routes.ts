import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { FhirSearchController } from "../modules/fhir-search/fhir-search.controller";
import { CLINICAL_READ_ROLES } from "../constants/rbac";

const router = Router();
const controller = new FhirSearchController();

router.get(
  "/Patient",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  controller.searchPatient,
);
router.get(
  "/Observation",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  controller.searchObservation,
);
router.get(
  "/Condition",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  controller.searchCondition,
);
router.get(
  "/MedicationRequest",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  controller.searchMedicationRequest,
);
router.get(
  "/Encounter",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  controller.searchEncounter,
);
router.get(
  "/AllergyIntolerance",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  controller.searchAllergyIntolerance,
);
router.get(
  "/Appointment",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  controller.searchAppointment,
);
router.get(
  "/DocumentReference",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  controller.searchDocumentReference,
);
router.get(
  "/Organization",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  controller.searchOrganization,
);
router.get(
  "/PractitionerRole",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  controller.searchPractitionerRole,
);
router.get(
  "/EpisodeOfCare",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  controller.searchEpisodeOfCare,
);
router.get(
  "/CarePlan",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  controller.searchCarePlan,
);
router.get(
  "/Immunization",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  controller.searchImmunization,
);

export default router;

