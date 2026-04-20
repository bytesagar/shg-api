import type { FacilityContext } from "../../context/facility-context";
import type { FamilyPlanningRepository } from "../clinical-visits/family-planning.repository";
import type { PatientRepository } from "../patients/patient.repository";
import type { VisitRepository } from "../clinical-visits/visit.repository";

type DbParentRepos = {
  visit: VisitRepository;
  familyPlanning: FamilyPlanningRepository;
  patient: PatientRepository;
};

/**
 * Resolves facility from a persisted parent row (Visit / FamilyPlanning / Patient).
 * Returns null if the row does not exist or is not in the caller’s facility.
 */
export async function resolveDbParentToFacilityId(
  sourceType: "Visit" | "FamilyPlanning" | "Patient",
  sourceId: string,
  context: FacilityContext,
  r: DbParentRepos,
): Promise<string | null> {
  switch (sourceType) {
    case "Visit": {
      const v = await r.visit.findById(sourceId);
      if (!v?.facilityId) return null;
      if (v.facilityId !== context.facilityId) return null;
      return v.facilityId;
    }
    case "FamilyPlanning": {
      const fp = await r.familyPlanning.findById(sourceId);
      if (!fp) return null;
      if (fp.facilityId !== context.facilityId) return null;
      return fp.facilityId;
    }
    case "Patient": {
      const p = await r.patient.findById(sourceId);
      if (!p?.facilityId) return null;
      if (p.facilityId !== context.facilityId) return null;
      return p.facilityId;
    }
    default: {
      const _never: never = sourceType;
      return _never;
    }
  }
}
