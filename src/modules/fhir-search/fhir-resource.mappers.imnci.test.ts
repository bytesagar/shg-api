import {
  mapConditionResource,
  mapMedicationDispenseResource,
  mapCarePlanResource,
} from "./fhir-resource.mappers";

describe("mapConditionResource (IMNCI classification)", () => {
  it("emits a Condition with IMNCI category + severity + classification code", () => {
    const resource = mapConditionResource({
      id: "cls-1",
      patientId: "pat-1",
      encounterId: "enc-1",
      recordedDate: new Date("2026-05-13T10:00:00Z"),
      description: "PNEUMONIA",
      verificationStatus: "confirmed",
      category: "imnci-classification",
      severityText: "yellow",
      codeSystem: "urn:shg:imnci-classification",
      codeValue: "PNEUMONIA",
    });

    expect(resource.resourceType).toBe("Condition");
    expect(resource.id).toBe("cls-1");
    expect(resource.verificationStatus).toEqual({ text: "confirmed" });
    expect(resource.category).toEqual([{ text: "imnci-classification" }]);
    expect(resource.severity).toEqual({ text: "yellow" });
    expect(resource.code.coding).toEqual([
      { system: "urn:shg:imnci-classification", code: "PNEUMONIA" },
    ]);
    expect(resource.code.text).toBe("PNEUMONIA");
    expect(resource.subject).toEqual({ reference: "Patient/pat-1" });
    expect(resource.encounter).toEqual({ reference: "Encounter/enc-1" });
    expect(resource.meta?.profile).toEqual(
      expect.arrayContaining([
        "https://shg.global/fhir/StructureDefinition/shg-condition",
      ]),
    );
  });

  it("omits the severity and category when not provided", () => {
    const resource = mapConditionResource({
      id: "c-1",
      patientId: "p-1",
      recordedDate: new Date(),
      description: "ICD-coded condition",
      verificationStatus: "confirmed",
      icdCode: "J18.9",
    });
    expect(resource.severity).toBeUndefined();
    expect(resource.category).toEqual([]);
    expect(resource.code.coding).toEqual([
      { system: "http://hl7.org/fhir/sid/icd-11", code: "J18.9" },
    ]);
  });
});

describe("mapCarePlanResource (IMNCI visit)", () => {
  it("emits a CarePlan with CB-IMNCI category and visit reference", () => {
    const resource = mapCarePlanResource({
      id: "visit-1",
      patientId: "pat-1",
      status: "active",
      intent: "plan",
      categoryText: "CB-IMNCI",
      title: "CB-IMNCI plan (sick_child)",
      description: "[PNEUMONIA] drug — drug=amoxicillin_dt 1tablet × 5d",
      createdAt: new Date("2026-05-13T10:00:00Z"),
    });

    expect(resource.resourceType).toBe("CarePlan");
    expect(resource.status).toBe("active");
    expect(resource.intent).toBe("plan");
    expect(resource.category).toEqual([{ text: "CB-IMNCI" }]);
    expect(resource.subject).toEqual({ reference: "Patient/pat-1" });
    expect(resource.description).toContain("amoxicillin_dt");
  });
});

describe("mapMedicationDispenseResource (FCHV commodity)", () => {
  it("emits a MedicationDispense with FCHV performer + screening context", () => {
    const resource = mapMedicationDispenseResource({
      id: "disp-1",
      patientId: "pat-1",
      performerUserId: "fchv-1",
      medicationText: "ors",
      medicationCode: "ors",
      quantity: { value: 2, unit: "sachet" },
      whenHandedOver: new Date("2026-05-13T10:00:00Z"),
      context: { type: "EpisodeOfCare", id: "screen-1" },
      category: "fchv-community-dispense",
    });

    expect(resource.resourceType).toBe("MedicationDispense");
    expect(resource.status).toBe("completed");
    expect(resource.category).toEqual({ text: "fchv-community-dispense" });
    expect(resource.medicationCodeableConcept.text).toBe("ors");
    expect(resource.medicationCodeableConcept.coding).toEqual([
      { system: "urn:shg:imnci-commodity", code: "ors" },
    ]);
    expect(resource.subject).toEqual({ reference: "Patient/pat-1" });
    expect(resource.performer).toEqual([
      { actor: { reference: "Practitioner/fchv-1" } },
    ]);
    expect(resource.quantity).toEqual({ value: 2, unit: "sachet" });
    expect(resource.context).toEqual({ reference: "EpisodeOfCare/screen-1" });
    expect(resource.meta?.profile).toEqual(
      expect.arrayContaining([
        "https://shg.global/fhir/StructureDefinition/shg-medication-dispense",
      ]),
    );
  });

  it("omits subject for anonymous community dispenses (no patient)", () => {
    const resource = mapMedicationDispenseResource({
      id: "disp-2",
      medicationText: "zinc",
      whenHandedOver: new Date(),
      performerUserId: "fchv-1",
    });
    expect(resource.subject).toBeUndefined();
  });
});
