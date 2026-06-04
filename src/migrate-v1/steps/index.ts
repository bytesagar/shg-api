import type { MigrationStep } from "../context";
import { geographyStep } from "./01-geography";
import { facilitiesStep } from "./02-facilities";
import { usersStep } from "./03-roles-users";
import { patientsStep } from "./04-patients";
import { encountersStep } from "./05-encounters";
import { clinicalStep } from "./06-clinical";
import { maternalStep } from "./07-maternal";
import { immunizationStep } from "./08-immunization";
import { familyPlanningStep } from "./09-family-planning";
import { commsStep } from "./10-comms";
import { backfillRegistrationVisitsStep } from "./11-backfill-registration-visits";
import { backfillTelehealthSessionsStep } from "./12-backfill-telehealth-sessions";

/**
 * Steps run strictly in this order so every FK target exists before it is
 * referenced: geography -> facilities -> users -> patients -> encounters ->
 * clinical/maternal/immunization/family-planning -> comms. The final
 * backfill step runs last because it depends on every visit-producing step
 * (05 encounters, 09 family-planning) having already populated `visits`. The
 * telehealth-session backfill follows comms (10) because it reads the
 * "appointment" id-map that step populates.
 */
export const STEPS: MigrationStep[] = [
  geographyStep,
  facilitiesStep,
  usersStep,
  patientsStep,
  encountersStep,
  clinicalStep,
  maternalStep,
  immunizationStep,
  familyPlanningStep,
  commsStep,
  backfillRegistrationVisitsStep,
  backfillTelehealthSessionsStep,
];
