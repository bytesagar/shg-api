/**
 * Conventional visit types (the clinical service a patient comes in for).
 *
 * Stored in `visits.service` / `encounters.service`. Kept as an app-level
 * constant (not a Postgres enum) so existing free-text rows keep reading, while
 * new visits are validated against this canonical list. The frontend mirrors
 * these values in its own constant.
 */
export const VISIT_TYPES = [
  "opd",
  "maternal_health",
  "immunization",
  "imnci",
  "nutrition",
  "family_planning",
  "tb",
  "leprosy",
  "vector_borne_disease",
  "sexual_disease",
  "non_communicable_disease",
  "other",
] as const;

export type VisitType = (typeof VISIT_TYPES)[number];

/** Human-readable labels (English). */
export const VISIT_TYPE_LABELS: Record<VisitType, string> = {
  opd: "OPD",
  maternal_health: "Maternal health",
  immunization: "Immunization",
  imnci: "IMNCI",
  nutrition: "Nutrition",
  family_planning: "Family planning",
  tb: "Tuberculosis",
  leprosy: "Leprosy",
  vector_borne_disease: "Vector-borne disease",
  sexual_disease: "Sexual / reproductive disease",
  non_communicable_disease: "Non-communicable disease",
  other: "Other",
};

export function isVisitType(value: unknown): value is VisitType {
  return (
    typeof value === "string" &&
    (VISIT_TYPES as readonly string[]).includes(value)
  );
}
