import {
  classify,
  ClassificationInput,
  ClassificationRule,
  TreatmentRule,
  FormularyEntry,
} from "./imnci-classification.service";
import { IMNCI_SECTIONS, IMNCI_CLASSIFICATION_CODES } from "@/constants/imnci";

// ---------------------------------------------------------------------------
// Fixture rules for the young_infant pathway (0–2 months).
// Mirrors the booklet stub in src/db/seeds/imnci/booklet.ts.
// ---------------------------------------------------------------------------

const psbiRule: ClassificationRule = {
  id: "rule-psbi",
  section: IMNCI_SECTIONS.PSBI,
  classificationCode: IMNCI_CLASSIFICATION_CODES.PSBI,
  severity: "pink",
  priority: 1,
  predicate: {
    or: [
      { field: "answers.psbi.not_feeding_well", op: "=", value: true },
      { field: "answers.psbi.convulsions", op: "=", value: true },
      { field: "answers.psbi.fast_breathing_60", op: "=", value: true },
      { field: "answers.psbi.severe_chest_indrawing", op: "=", value: true },
      { field: "answers.psbi.temperature_high", op: "=", value: true },
      { field: "answers.psbi.temperature_low", op: "=", value: true },
      { field: "answers.psbi.movement_reduced", op: "=", value: true },
    ],
  },
};

const jaundiceRules: ClassificationRule[] = [
  {
    id: "rule-jaundice-severe",
    section: IMNCI_SECTIONS.JAUNDICE,
    classificationCode: IMNCI_CLASSIFICATION_CODES.SEVERE_JAUNDICE,
    severity: "pink",
    priority: 1,
    predicate: {
      and: [
        { field: "answers.jaundice.present", op: "=", value: true },
        {
          or: [
            { field: "answers.jaundice.yellow_palms_or_soles", op: "=", value: true },
            { field: "answers.jaundice.severe_age_window", op: "=", value: true },
          ],
        },
      ],
    },
  },
  {
    id: "rule-jaundice",
    section: IMNCI_SECTIONS.JAUNDICE,
    classificationCode: IMNCI_CLASSIFICATION_CODES.JAUNDICE,
    severity: "yellow",
    priority: 2,
    predicate: { field: "answers.jaundice.present", op: "=", value: true },
  },
  {
    id: "rule-jaundice-none",
    section: IMNCI_SECTIONS.JAUNDICE,
    classificationCode: IMNCI_CLASSIFICATION_CODES.NO_JAUNDICE,
    severity: "green",
    priority: 99,
    predicate: { field: "answers.jaundice.present", op: "=", value: false },
  },
];

const localInfectionRules: ClassificationRule[] = [
  {
    id: "rule-lbi",
    section: IMNCI_SECTIONS.LOCAL_BACTERIAL_INFECTION,
    classificationCode: IMNCI_CLASSIFICATION_CODES.LOCAL_BACTERIAL_INFECTION,
    severity: "yellow",
    priority: 1,
    predicate: {
      or: [
        { field: "answers.local.umbilicus_red_or_pus", op: "=", value: true },
        { field: "answers.local.skin_pustules", op: "=", value: true },
      ],
    },
  },
  {
    id: "rule-lbi-none",
    section: IMNCI_SECTIONS.LOCAL_BACTERIAL_INFECTION,
    classificationCode: IMNCI_CLASSIFICATION_CODES.NO_LOCAL_BACTERIAL_INFECTION,
    severity: "green",
    priority: 99,
    predicate: {
      and: [
        { field: "answers.local.umbilicus_red_or_pus", op: "=", value: false },
        { field: "answers.local.skin_pustules", op: "=", value: false },
      ],
    },
  },
];

const feedingRules: ClassificationRule[] = [
  {
    id: "rule-feeding",
    section: IMNCI_SECTIONS.FEEDING_PROBLEM,
    classificationCode: IMNCI_CLASSIFICATION_CODES.FEEDING_PROBLEM,
    severity: "yellow",
    priority: 1,
    predicate: {
      or: [
        { field: "answers.feeding.problem", op: "=", value: true },
        { field: "answers.feeding.not_well_attached", op: "=", value: true },
        { field: "answers.feeding.not_suckling_effectively", op: "=", value: true },
      ],
    },
  },
  {
    id: "rule-feeding-none",
    section: IMNCI_SECTIONS.FEEDING_PROBLEM,
    classificationCode: IMNCI_CLASSIFICATION_CODES.NO_FEEDING_PROBLEM,
    severity: "green",
    priority: 99,
    predicate: { field: "answers.feeding.problem", op: "=", value: false },
  },
];

const allRules = [
  psbiRule,
  ...jaundiceRules,
  ...localInfectionRules,
  ...feedingRules,
];

const treatmentRules: TreatmentRule[] = [
  {
    classificationCode: IMNCI_CLASSIFICATION_CODES.PSBI,
    actionKind: "drug",
    drugCode: "gentamicin_inj",
    durationDays: 1,
    sequence: 0,
  },
  {
    classificationCode: IMNCI_CLASSIFICATION_CODES.PSBI,
    actionKind: "referral",
    sequence: 1,
  },
  {
    classificationCode: IMNCI_CLASSIFICATION_CODES.LOCAL_BACTERIAL_INFECTION,
    actionKind: "drug",
    drugCode: "amoxicillin_syrup_young_infant",
    durationDays: 5,
    sequence: 0,
  },
  {
    classificationCode: IMNCI_CLASSIFICATION_CODES.JAUNDICE,
    actionKind: "counselling",
    counsellingKey: "jaundice_home_care",
    followUpDays: 2,
    sequence: 0,
  },
];

const formulary: FormularyEntry[] = [
  {
    drugCode: "gentamicin_inj",
    name: "Gentamicin IM 20mg/2ml",
    formulation: "injection",
    weightBandedDoses: [
      {
        minAgeMonths: 0,
        maxAgeMonths: 2,
        minWeightKg: 1,
        maxWeightKg: 6,
        doseAmount: 5,
        doseUnit: "mg/kg",
        frequency: "single dose IM",
      },
    ],
  },
  {
    drugCode: "amoxicillin_syrup_young_infant",
    name: "Amoxicillin syrup 125mg/5ml",
    formulation: "oral syrup",
    weightBandedDoses: [
      {
        minAgeMonths: 0,
        maxAgeMonths: 2,
        doseAmount: 2.5,
        doseUnit: "ml",
        frequency: "BID",
      },
    ],
  },
];

function makeInput(overrides: Partial<ClassificationInput> = {}): ClassificationInput {
  return {
    patient: { ageMonths: 1, weightKg: 4 },
    answers: {},
    rules: allRules,
    treatmentRules,
    formulary,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------

describe("imnci classification engine — young_infant pathway", () => {
  it("fires PSBI (pink) when any single PSBI sign is present", () => {
    const result = classify(
      makeInput({ answers: { "psbi.fast_breathing_60": true } }),
    );
    const psbi = result.classifications.find(
      (c) => c.section === IMNCI_SECTIONS.PSBI,
    );
    expect(psbi?.code).toBe(IMNCI_CLASSIFICATION_CODES.PSBI);
    expect(psbi?.severity).toBe("pink");
    expect(psbi?.referralRequired).toBe(true);
  });

  it("fires PSBI on convulsions alone", () => {
    const result = classify(
      makeInput({ answers: { "psbi.convulsions": true } }),
    );
    expect(
      result.classifications.find((c) => c.section === IMNCI_SECTIONS.PSBI)?.code,
    ).toBe(IMNCI_CLASSIFICATION_CODES.PSBI);
  });

  it("emits pre-referral gentamicin + referral plan items for PSBI", () => {
    const result = classify(
      makeInput({ answers: { "psbi.movement_reduced": true } }),
    );
    const planKinds = result.planItems.map((p) => `${p.classificationCode}:${p.kind}`);
    expect(planKinds).toEqual(
      expect.arrayContaining([
        `${IMNCI_CLASSIFICATION_CODES.PSBI}:drug`,
        `${IMNCI_CLASSIFICATION_CODES.PSBI}:referral`,
      ]),
    );
    const drug = result.planItems.find(
      (p) => p.classificationCode === IMNCI_CLASSIFICATION_CODES.PSBI && p.kind === "drug",
    );
    expect(drug?.drugCode).toBe("gentamicin_inj");
    expect(drug?.doseAmount).toBe(5);
    expect(drug?.doseUnit).toBe("mg/kg");
  });

  it("classifies severe jaundice (pink) when palms or soles are yellow", () => {
    const result = classify(
      makeInput({
        answers: {
          "jaundice.present": true,
          "jaundice.yellow_palms_or_soles": true,
        },
      }),
    );
    const j = result.classifications.find(
      (c) => c.section === IMNCI_SECTIONS.JAUNDICE,
    );
    expect(j?.code).toBe(IMNCI_CLASSIFICATION_CODES.SEVERE_JAUNDICE);
    expect(j?.severity).toBe("pink");
  });

  it("classifies severe jaundice when in the high-risk age window", () => {
    const result = classify(
      makeInput({
        answers: {
          "jaundice.present": true,
          "jaundice.severe_age_window": true,
        },
      }),
    );
    expect(
      result.classifications.find((c) => c.section === IMNCI_SECTIONS.JAUNDICE)
        ?.code,
    ).toBe(IMNCI_CLASSIFICATION_CODES.SEVERE_JAUNDICE);
  });

  it("classifies jaundice (yellow) when present but not severe", () => {
    const result = classify(
      makeInput({
        answers: {
          "jaundice.present": true,
          "jaundice.yellow_palms_or_soles": false,
          "jaundice.severe_age_window": false,
        },
      }),
    );
    const j = result.classifications.find(
      (c) => c.section === IMNCI_SECTIONS.JAUNDICE,
    );
    expect(j?.code).toBe(IMNCI_CLASSIFICATION_CODES.JAUNDICE);
    expect(j?.severity).toBe("yellow");
  });

  it("classifies no jaundice (green) only when explicitly answered false", () => {
    const result = classify(
      makeInput({ answers: { "jaundice.present": false } }),
    );
    expect(
      result.classifications.find((c) => c.section === IMNCI_SECTIONS.JAUNDICE)
        ?.code,
    ).toBe(IMNCI_CLASSIFICATION_CODES.NO_JAUNDICE);
  });

  it("returns no jaundice classification when the section was not assessed", () => {
    const result = classify(
      makeInput({ answers: { "psbi.fast_breathing_60": true } }),
    );
    expect(
      result.classifications.find((c) => c.section === IMNCI_SECTIONS.JAUNDICE),
    ).toBeUndefined();
  });

  it("classifies local bacterial infection on umbilicus redness", () => {
    const result = classify(
      makeInput({ answers: { "local.umbilicus_red_or_pus": true } }),
    );
    const lbi = result.classifications.find(
      (c) => c.section === IMNCI_SECTIONS.LOCAL_BACTERIAL_INFECTION,
    );
    expect(lbi?.code).toBe(IMNCI_CLASSIFICATION_CODES.LOCAL_BACTERIAL_INFECTION);
    expect(lbi?.severity).toBe("yellow");
    expect(lbi?.referralRequired).toBe(false);
  });

  it("classifies feeding problem on any feeding-difficulty answer", () => {
    const result = classify(
      makeInput({ answers: { "feeding.not_well_attached": true } }),
    );
    const f = result.classifications.find(
      (c) => c.section === IMNCI_SECTIONS.FEEDING_PROBLEM,
    );
    expect(f?.code).toBe(IMNCI_CLASSIFICATION_CODES.FEEDING_PROBLEM);
    expect(f?.severity).toBe("yellow");
  });

  it("can return PSBI together with jaundice + LBI + feeding in one visit", () => {
    const result = classify(
      makeInput({
        answers: {
          "psbi.fast_breathing_60": true,
          "jaundice.present": true,
          "local.skin_pustules": true,
          "feeding.problem": true,
        },
      }),
    );
    const codes = result.classifications.map((c) => c.code).sort();
    expect(codes).toEqual(
      [
        IMNCI_CLASSIFICATION_CODES.PSBI,
        IMNCI_CLASSIFICATION_CODES.JAUNDICE,
        IMNCI_CLASSIFICATION_CODES.LOCAL_BACTERIAL_INFECTION,
        IMNCI_CLASSIFICATION_CODES.FEEDING_PROBLEM,
      ].sort(),
    );
  });

  it("does not blanket-escalate non-pink results when PSBI fires (no DANGER_SIGNS section)", () => {
    // Unlike the sick_child pathway, young_infant has no separate danger_signs
    // section — PSBI itself is the danger-sign-equivalent and is already pink.
    // Yellow classifications stay yellow with referralRequired=false.
    const result = classify(
      makeInput({
        answers: {
          "psbi.convulsions": true,
          "feeding.problem": true,
        },
      }),
    );
    const feeding = result.classifications.find(
      (c) => c.section === IMNCI_SECTIONS.FEEDING_PROBLEM,
    );
    expect(feeding?.severity).toBe("yellow");
    expect(feeding?.referralRequired).toBe(false);
  });
});
