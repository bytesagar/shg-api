export type FhirSearchResourceType =
  | "Patient"
  | "Observation"
  | "Condition"
  | "MedicationRequest"
  | "Encounter"
  | "AllergyIntolerance"
  | "Appointment"
  | "DocumentReference"
  | "Organization"
  | "PractitionerRole"
  | "Practitioner"
  | "EpisodeOfCare"
  | "CarePlan"
  | "Immunization";

export type FhirSearchRequest = {
  count: number;
  offset: number;
  filters: Record<string, string[]>;
};

export type FhirBundleEntry<T> = {
  fullUrl?: string;
  resource: T;
};

export type FhirSearchBundle<T> = {
  resourceType: "Bundle";
  type: "searchset";
  total: number;
  entry: Array<FhirBundleEntry<T>>;
};

