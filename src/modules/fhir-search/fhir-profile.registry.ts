export const FHIR_PROFILE_REGISTRY = {
  Patient: ["https://shg.global/fhir/StructureDefinition/shg-patient"],
  Encounter: ["https://shg.global/fhir/StructureDefinition/shg-encounter"],
  Condition: ["https://shg.global/fhir/StructureDefinition/shg-condition"],
  ObservationLab: ["https://shg.global/fhir/StructureDefinition/shg-observation-lab"],
  ObservationVital: ["https://shg.global/fhir/StructureDefinition/shg-observation-vital"],
  ObservationMaternal: [
    "https://shg.global/fhir/StructureDefinition/shg-observation-maternal",
  ],
  ObservationGrowth: [
    "https://shg.global/fhir/StructureDefinition/shg-observation-growth",
  ],
  MedicationRequest: [
    "https://shg.global/fhir/StructureDefinition/shg-medication-request",
  ],
  MedicationDispense: [
    "https://shg.global/fhir/StructureDefinition/shg-medication-dispense",
  ],
  AllergyIntolerance: [
    "https://shg.global/fhir/StructureDefinition/shg-allergy-intolerance",
  ],
  Appointment: ["https://shg.global/fhir/StructureDefinition/shg-appointment"],
  DocumentReference: [
    "https://shg.global/fhir/StructureDefinition/shg-document-reference",
  ],
  Organization: ["https://shg.global/fhir/StructureDefinition/shg-organization"],
  PractitionerRole: [
    "https://shg.global/fhir/StructureDefinition/shg-practitioner-role",
  ],
  Practitioner: ["https://shg.global/fhir/StructureDefinition/shg-practitioner"],
  EpisodeOfCare: ["https://shg.global/fhir/StructureDefinition/shg-episode-of-care"],
  CarePlan: ["https://shg.global/fhir/StructureDefinition/shg-care-plan"],
  Immunization: ["https://shg.global/fhir/StructureDefinition/shg-immunization"],
} as const;

export type FhirProfileKey = keyof typeof FHIR_PROFILE_REGISTRY;

export type WithMeta<T> = T & {
  meta: { profile: readonly string[] } & Record<string, unknown>;
};

export function withFhirProfile<T extends Record<string, any>>(
  profileKey: FhirProfileKey,
  resource: T,
): WithMeta<T> {
  return {
    ...resource,
    meta: {
      ...(resource.meta ?? {}),
      profile: FHIR_PROFILE_REGISTRY[profileKey],
    },
  } as WithMeta<T>;
}

