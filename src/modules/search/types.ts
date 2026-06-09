/**
 * Global search payload contract. Mirrors docs/GLOBAL_SEARCH_PLAN.md.
 *
 * Hits never carry a `url`. The frontend owns `routeFor(hit)` and constructs
 * URLs from `type + context`.
 */

import { RBAC_ROLES } from "../../constants/rbac";

// ----------------------------------------------------------------------------
// Scope context resolved per request from the auth middleware's req.context.
// Adds `municipalityId` (looked up lazily from users) over FacilityContext.
// ----------------------------------------------------------------------------

export type SearchRole =
  | typeof RBAC_ROLES.ADMIN
  | typeof RBAC_ROLES.HF_USER
  | typeof RBAC_ROLES.DOCTOR
  | typeof RBAC_ROLES.FCHV_USER
  | typeof RBAC_ROLES.USER
  | typeof RBAC_ROLES.PATIENT
  | typeof RBAC_ROLES.NURSE
  | typeof RBAC_ROLES.CHW
  | typeof RBAC_ROLES.MUNICIPALITY_USER;

export interface ScopeContext {
  userId: string;
  role: SearchRole;
  /** null when role is `admin`. */
  facilityId: string | null;
  /** Lazily resolved on first need; null when unknown. */
  municipalityId: string | null;
}

// ----------------------------------------------------------------------------
// Query classification.
// ----------------------------------------------------------------------------

export type Classification = "phone" | "patient_id" | "numeric" | "name";

// ----------------------------------------------------------------------------
// Entity discriminators. Phase 1 only.
// ----------------------------------------------------------------------------

export type EntityType =
  | "patient"
  | "appointment"
  | "practitioner"
  | "visit"
  | "encounter";

// ----------------------------------------------------------------------------
// Per-entity context payloads. Each is exactly the IDs the plan's Phase 1
// entity table specifies - no more, no less.
// ----------------------------------------------------------------------------

export interface PatientContext {
  patient_id: string;
  facility_id: string | null;
}

export interface AppointmentContext {
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
}

export interface PractitionerContext {
  practitioner_id: string;
  user_id?: string;
  facility_id?: string;
}

export interface VisitContext {
  visit_id: string;
  patient_id: string;
}

export interface EncounterContext {
  encounter_id: string;
  visit_id: string;
  patient_id: string;
}

// ----------------------------------------------------------------------------
// SearchHit. Discriminated union so each runner can only emit the right
// context shape for its type.
// ----------------------------------------------------------------------------

interface BaseHit<TType extends EntityType, TContext> {
  type: TType;
  id: string;
  title: string;
  subtitle: string;
  context: TContext;
  matched_field: string;
  score: number;
}

export type PatientHit = BaseHit<"patient", PatientContext>;
export type AppointmentHit = BaseHit<"appointment", AppointmentContext>;
export type PractitionerHit = BaseHit<"practitioner", PractitionerContext>;
export type VisitHit = BaseHit<"visit", VisitContext>;
export type EncounterHit = BaseHit<"encounter", EncounterContext>;

export type SearchHit =
  | PatientHit
  | AppointmentHit
  | PractitionerHit
  | VisitHit
  | EncounterHit;

// ----------------------------------------------------------------------------
// Category + response envelope.
// ----------------------------------------------------------------------------

export interface SearchCategory {
  type: EntityType;
  label: string;
  total: number;
  /** True when this runner timed out or errored; results may be empty/partial. */
  partial: boolean;
  results: SearchHit[];
}

export interface SearchResponse {
  query: string;
  classification: Classification;
  took_ms: number;
  /** True when any category timed out or the overall 1.5s budget was exceeded. */
  partial: boolean;
  categories: SearchCategory[];
}

// ----------------------------------------------------------------------------
// Empty-state response shape.
// ----------------------------------------------------------------------------

export interface EmptyStateResponse {
  upcoming_appointments: AppointmentHit[];
  recent_patients: PatientHit[];
}

// ----------------------------------------------------------------------------
// Internal runner contract. Returned `total` is the count of results actually
// produced (after limit), kept on the category envelope per the plan.
// ----------------------------------------------------------------------------

export interface RunnerResult<THit extends SearchHit = SearchHit> {
  total: number;
  results: THit[];
}
