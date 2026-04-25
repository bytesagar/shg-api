import { FhirProfileKey, withFhirProfile } from "./fhir-profile.registry";

export function mapPatientResource(input: {
  id: string;
  active: boolean;
  patientId: string;
  gender?: string | null;
  birthDate?: Date | null;
  name?: {
    use?: string | null;
    family?: string | null;
    given?: string | null;
    middle?: string | null;
  } | null;
  telecom?: {
    system?: string | null;
    use?: string | null;
    value?: string | null;
  } | null;
}) {
  return withFhirProfile("Patient", {
    resourceType: "Patient",
    id: input.id,
    active: input.active,
    identifier: [{ system: "patient-id", value: input.patientId }],
    name: input.name
      ? [
          {
            use: input.name.use ?? "official",
            family: input.name.family ?? null,
            given: [input.name.given, input.name.middle].filter(Boolean),
          },
        ]
      : [],
    telecom:
      input.telecom?.value
        ? [
            {
              system: input.telecom.system ?? "phone",
              use: input.telecom.use ?? "mobile",
              value: input.telecom.value,
            },
          ]
        : [],
    gender: input.gender ?? null,
    birthDate: input.birthDate ?? null,
  });
}

export function mapEncounterResource(input: {
  id: string;
  status: string | null;
  encounterType: string;
  patientId: string;
  encounterAt: Date;
  reason?: string | null;
}) {
  return withFhirProfile("Encounter", {
    resourceType: "Encounter",
    id: input.id,
    status: input.status,
    class: { text: input.encounterType },
    subject: { reference: `Patient/${input.patientId}` },
    period: { start: input.encounterAt },
    reasonCode: input.reason ? [{ text: input.reason }] : [],
  });
}

export function mapConditionResource(input: {
  id: string;
  patientId: string;
  encounterId?: string | null;
  recordedDate: Date;
  description: string;
  verificationStatus: "provisional" | "confirmed";
  icdCode?: string | null;
}) {
  return withFhirProfile("Condition", {
    resourceType: "Condition",
    id: input.id,
    verificationStatus: { text: input.verificationStatus },
    code: {
      coding:
        input.icdCode && input.icdCode.trim().length > 0
          ? [{ system: "http://hl7.org/fhir/sid/icd-11", code: input.icdCode }]
          : [],
      text: input.description,
    },
    subject: { reference: `Patient/${input.patientId}` },
    encounter: input.encounterId
      ? { reference: `Encounter/${input.encounterId}` }
      : undefined,
    recordedDate: input.recordedDate,
  });
}

export function mapOrganizationResource(input: {
  id: string;
  name: string;
  active: boolean;
  hfCode?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  ward?: string | null;
  palika?: string | null;
  district?: string | null;
  province?: string | null;
}) {
  return withFhirProfile("Organization", {
    resourceType: "Organization",
    id: input.id,
    active: input.active,
    identifier: input.hfCode ? [{ system: "urn:shg:hf-code", value: input.hfCode }] : [],
    name: input.name,
    telecom: [
      input.phone ? { system: "phone", value: input.phone } : null,
      input.email ? { system: "email", value: input.email } : null,
    ].filter(Boolean),
    address:
      input.address || input.ward || input.palika || input.district || input.province
        ? [
            {
              text: input.address ?? null,
              district: input.district ?? null,
              state: input.province ?? null,
              city: input.palika ?? null,
              line: [input.ward].filter(Boolean),
            },
          ]
        : [],
  });
}

export function mapPractitionerRoleResource(input: {
  id: string;
  practitionerId: string;
  roleCode: string;
  specialty?: string | null;
  organizationId?: string | null;
  active: boolean;
}) {
  return withFhirProfile("PractitionerRole", {
    resourceType: "PractitionerRole",
    id: input.id,
    active: input.active,
    practitioner: { reference: `Practitioner/${input.practitionerId}` },
    organization: input.organizationId
      ? { reference: `Organization/${input.organizationId}` }
      : undefined,
    code: [{ text: input.roleCode }],
    specialty: input.specialty ? [{ text: input.specialty }] : [],
  });
}

export function mapPractitionerResource(input: {
  id: string;
  nameText?: string | null;
  active: boolean;
}) {
  return withFhirProfile("Practitioner", {
    resourceType: "Practitioner",
    id: input.id,
    active: input.active,
    name: input.nameText ? [{ text: input.nameText }] : [],
  });
}

export function mapDocumentReferenceResource(input: {
  id: string;
  sourceType: string;
  sourceId: string;
  fileUrl: string;
  name: string;
  fileType?: string | null;
  fileSize?: number | null;
  createdAt: Date;
  patientId?: string | null;
}) {
  return withFhirProfile("DocumentReference", {
    resourceType: "DocumentReference",
    id: input.id,
    status: "current",
    type: { text: input.sourceType },
    subject: input.patientId ? { reference: `Patient/${input.patientId}` } : undefined,
    date: input.createdAt,
    description: input.name,
    content: [
      {
        attachment: {
          contentType: input.fileType ?? undefined,
          url: input.fileUrl,
          title: input.name,
          size: input.fileSize ?? undefined,
        },
      },
    ],
    context: {
      related: [{ reference: `${input.sourceType}/${input.sourceId}` }],
    },
  });
}

export function mapEpisodeOfCareResource(input: {
  id: string;
  patientId: string;
  status: "planned" | "active" | "finished";
  start: Date;
  end?: Date | null;
  typeText: string;
}) {
  return withFhirProfile("EpisodeOfCare", {
    resourceType: "EpisodeOfCare",
    id: input.id,
    status: input.status,
    type: [{ text: input.typeText }],
    patient: { reference: `Patient/${input.patientId}` },
    period: {
      start: input.start,
      end: input.end ?? undefined,
    },
  });
}

export function mapCarePlanResource(input: {
  id: string;
  patientId: string;
  status: "draft" | "active" | "completed";
  intent: "plan" | "order";
  categoryText: string;
  title: string;
  description?: string | null;
  createdAt: Date;
}) {
  return withFhirProfile("CarePlan", {
    resourceType: "CarePlan",
    id: input.id,
    status: input.status,
    intent: input.intent,
    category: [{ text: input.categoryText }],
    title: input.title,
    description: input.description ?? undefined,
    subject: { reference: `Patient/${input.patientId}` },
    created: input.createdAt,
  });
}

export function mapImmunizationResource(input: {
  id: string;
  patientId: string;
  vaccineName: string;
  occurrence: Date;
  status: "completed" | "not-done";
  note?: string | null;
}) {
  return withFhirProfile("Immunization", {
    resourceType: "Immunization",
    id: input.id,
    status: input.status,
    vaccineCode: { text: input.vaccineName },
    patient: { reference: `Patient/${input.patientId}` },
    occurrenceDateTime: input.occurrence,
    note: input.note ? [{ text: input.note }] : [],
  });
}

export function mapMedicationRequestResource(input: {
  id: string;
  patientId: string;
  encounterId?: string | null;
  medicineName?: string | null;
  authoredOn: Date;
  dosageText: string;
}) {
  return withFhirProfile("MedicationRequest", {
    resourceType: "MedicationRequest",
    id: input.id,
    status: "active",
    intent: "order",
    medicationCodeableConcept: {
      text: input.medicineName,
    },
    subject: { reference: `Patient/${input.patientId}` },
    encounter: input.encounterId
      ? { reference: `Encounter/${input.encounterId}` }
      : undefined,
    authoredOn: input.authoredOn,
    dosageInstruction: [{ text: input.dosageText }],
  });
}

export function mapAllergyIntoleranceResource(input: {
  id: string;
  patientId: string;
  encounterId?: string | null;
  codeText: string;
  recordedDate: Date;
}) {
  return withFhirProfile("AllergyIntolerance", {
    resourceType: "AllergyIntolerance",
    id: input.id,
    clinicalStatus: { text: "active" },
    verificationStatus: { text: "unconfirmed" },
    code: { text: input.codeText },
    patient: { reference: `Patient/${input.patientId}` },
    encounter: input.encounterId
      ? { reference: `Encounter/${input.encounterId}` }
      : undefined,
    recordedDate: input.recordedDate,
  });
}

export function mapAppointmentResource(input: {
  id: string;
  status: string;
  service?: string | null;
  start: Date;
  patientId: string;
  doctorId: string;
}) {
  return withFhirProfile("Appointment", {
    resourceType: "Appointment",
    id: input.id,
    status: input.status,
    serviceType: input.service ? [{ text: input.service }] : [],
    start: input.start,
    participant: [
      { actor: { reference: `Patient/${input.patientId}` }, status: "accepted" },
      { actor: { reference: `Practitioner/${input.doctorId}` }, status: "accepted" },
    ],
  });
}

export function mapObservationResource(
  profileKey:
    | "ObservationLab"
    | "ObservationVital"
    | "ObservationMaternal"
    | "ObservationGrowth",
  resource: Record<string, any>,
) {
  return withFhirProfile(profileKey as FhirProfileKey, resource);
}

