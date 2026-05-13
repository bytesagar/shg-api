import {
  classify,
  ClassificationInput,
  ClassificationRule,
  TreatmentRule,
  FormularyEntry,
  pickDoseBand,
} from "./imnci-classification.service";
import { IMNCI_SECTIONS, IMNCI_CLASSIFICATION_CODES } from "@/constants/imnci";

// ---------------------------------------------------------------------------
// Fixture rules: minimal subset of the CB-IMNCI Sick Child booklet sufficient
// to exercise the engine's three colour bands and the danger-signs post-pass.
// ---------------------------------------------------------------------------

const dangerSignRules: ClassificationRule[] = [
  {
    id: "rule-danger-pink",
    section: IMNCI_SECTIONS.DANGER_SIGNS,
    classificationCode: IMNCI_CLASSIFICATION_CODES.GENERAL_DANGER_SIGN,
    severity: "pink",
    priority: 1,
    predicate: {
      or: [
        { field: "answers.danger.not_able_to_drink", op: "=", value: true },
        { field: "answers.danger.vomits_everything", op: "=", value: true },
        { field: "answers.danger.convulsions", op: "=", value: true },
        { field: "answers.danger.lethargic_unconscious", op: "=", value: true },
      ],
    },
  },
];

const coughRules: ClassificationRule[] = [
  {
    id: "rule-cough-severe",
    section: IMNCI_SECTIONS.COUGH,
    classificationCode: IMNCI_CLASSIFICATION_CODES.SEVERE_PNEUMONIA,
    severity: "pink",
    priority: 1,
    predicate: {
      and: [
        { field: "answers.cough.present", op: "=", value: true },
        {
          or: [
            { field: "answers.cough.chest_indrawing", op: "=", value: true },
            { field: "answers.cough.stridor", op: "=", value: true },
          ],
        },
      ],
    },
  },
  {
    id: "rule-cough-pneumonia",
    section: IMNCI_SECTIONS.COUGH,
    classificationCode: IMNCI_CLASSIFICATION_CODES.PNEUMONIA,
    severity: "yellow",
    priority: 2,
    predicate: {
      and: [
        { field: "answers.cough.present", op: "=", value: true },
        { field: "answers.cough.fast_breathing", op: "=", value: true },
      ],
    },
  },
  {
    id: "rule-cough-none",
    section: IMNCI_SECTIONS.COUGH,
    classificationCode: IMNCI_CLASSIFICATION_CODES.NO_PNEUMONIA,
    severity: "green",
    priority: 99,
    predicate: { field: "answers.cough.present", op: "=", value: true },
  },
];

const diarrhoeaRules: ClassificationRule[] = [
  {
    id: "rule-dehyd-severe",
    section: IMNCI_SECTIONS.DIARRHOEA,
    classificationCode: IMNCI_CLASSIFICATION_CODES.SEVERE_DEHYDRATION,
    severity: "pink",
    priority: 1,
    predicate: {
      and: [
        { field: "answers.diarrhoea.present", op: "=", value: true },
        {
          or: [
            { field: "answers.diarrhoea.lethargic", op: "=", value: true },
            { field: "answers.diarrhoea.sunken_eyes", op: "=", value: true },
            { field: "answers.diarrhoea.skin_pinch_very_slow", op: "=", value: true },
          ],
        },
      ],
    },
  },
  {
    id: "rule-dehyd-some",
    section: IMNCI_SECTIONS.DIARRHOEA,
    classificationCode: IMNCI_CLASSIFICATION_CODES.SOME_DEHYDRATION,
    severity: "yellow",
    priority: 2,
    predicate: {
      and: [
        { field: "answers.diarrhoea.present", op: "=", value: true },
        { field: "answers.diarrhoea.restless_irritable", op: "=", value: true },
      ],
    },
  },
  {
    id: "rule-dehyd-none",
    section: IMNCI_SECTIONS.DIARRHOEA,
    classificationCode: IMNCI_CLASSIFICATION_CODES.NO_DEHYDRATION,
    severity: "green",
    priority: 99,
    predicate: { field: "answers.diarrhoea.present", op: "=", value: true },
  },
];

const allRules = [...dangerSignRules, ...coughRules, ...diarrhoeaRules];

const treatmentRules: TreatmentRule[] = [
  {
    classificationCode: IMNCI_CLASSIFICATION_CODES.PNEUMONIA,
    actionKind: "drug",
    drugCode: "amoxicillin_dt",
    durationDays: 5,
    followUpDays: 2,
    sequence: 0,
  },
  {
    classificationCode: IMNCI_CLASSIFICATION_CODES.SEVERE_PNEUMONIA,
    actionKind: "drug",
    drugCode: "amoxicillin_dt",
    durationDays: 1, // pre-referral first dose
    sequence: 0,
  },
  {
    classificationCode: IMNCI_CLASSIFICATION_CODES.SEVERE_PNEUMONIA,
    actionKind: "referral",
    sequence: 1,
  },
  {
    classificationCode: IMNCI_CLASSIFICATION_CODES.SOME_DEHYDRATION,
    actionKind: "drug",
    drugCode: "ors",
    durationDays: 1,
    sequence: 0,
  },
];

const formulary: FormularyEntry[] = [
  {
    drugCode: "amoxicillin_dt",
    name: "Amoxicillin DT 250mg",
    formulation: "dispersible tablet",
    weightBandedDoses: [
      { minWeightKg: 4, maxWeightKg: 10, doseAmount: 1, doseUnit: "tablet", frequency: "BID" },
      { minWeightKg: 10, maxWeightKg: 20, doseAmount: 2, doseUnit: "tablet", frequency: "BID" },
    ],
  },
  {
    drugCode: "ors",
    name: "ORS",
    formulation: "sachet",
    weightBandedDoses: [
      { minAgeMonths: 2, maxAgeMonths: 12, doseAmount: 100, doseUnit: "ml", frequency: "after each loose stool" },
      { minAgeMonths: 12, maxAgeMonths: 60, doseAmount: 200, doseUnit: "ml", frequency: "after each loose stool" },
    ],
  },
];

function makeInput(overrides: Partial<ClassificationInput> = {}): ClassificationInput {
  return {
    patient: { ageMonths: 18, weightKg: 9 },
    answers: {},
    rules: allRules,
    treatmentRules,
    formulary,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------

describe("imnci classification engine", () => {
  it("classifies severe pneumonia (pink) when chest indrawing is present", () => {
    const result = classify(
      makeInput({
        answers: {
          "cough.present": true,
          "cough.fast_breathing": true,
          "cough.chest_indrawing": true,
        },
      }),
    );

    const cough = result.classifications.find((c) => c.section === IMNCI_SECTIONS.COUGH);
    expect(cough?.code).toBe(IMNCI_CLASSIFICATION_CODES.SEVERE_PNEUMONIA);
    expect(cough?.severity).toBe("pink");
    expect(cough?.referralRequired).toBe(true);

    // pre-referral amoxicillin + referral action both present
    const planCodes = result.planItems.map((p) => `${p.classificationCode}:${p.kind}`);
    expect(planCodes).toEqual(
      expect.arrayContaining([
        `${IMNCI_CLASSIFICATION_CODES.SEVERE_PNEUMONIA}:drug`,
        `${IMNCI_CLASSIFICATION_CODES.SEVERE_PNEUMONIA}:referral`,
      ]),
    );
  });

  it("classifies pneumonia (yellow) on fast breathing without indrawing", () => {
    const result = classify(
      makeInput({
        answers: {
          "cough.present": true,
          "cough.fast_breathing": true,
          "cough.chest_indrawing": false,
        },
      }),
    );

    const cough = result.classifications.find((c) => c.section === IMNCI_SECTIONS.COUGH);
    expect(cough?.code).toBe(IMNCI_CLASSIFICATION_CODES.PNEUMONIA);
    expect(cough?.severity).toBe("yellow");
    expect(cough?.referralRequired).toBe(false);

    const drug = result.planItems.find((p) => p.kind === "drug");
    expect(drug?.drugCode).toBe("amoxicillin_dt");
    // 9kg falls in the 4–10 band
    expect(drug?.doseAmount).toBe(1);
    expect(drug?.doseUnit).toBe("tablet");
  });

  it("classifies no pneumonia (green) when cough is present but no danger signs", () => {
    const result = classify(
      makeInput({
        answers: {
          "cough.present": true,
          "cough.fast_breathing": false,
          "cough.chest_indrawing": false,
          "cough.stridor": false,
        },
      }),
    );

    const cough = result.classifications.find((c) => c.section === IMNCI_SECTIONS.COUGH);
    expect(cough?.code).toBe(IMNCI_CLASSIFICATION_CODES.NO_PNEUMONIA);
    expect(cough?.severity).toBe("green");
  });

  it("returns multiple classifications across sections in one visit", () => {
    const result = classify(
      makeInput({
        answers: {
          "cough.present": true,
          "cough.fast_breathing": true,
          "diarrhoea.present": true,
          "diarrhoea.restless_irritable": true,
        },
      }),
    );

    const codes = result.classifications.map((c) => c.code).sort();
    expect(codes).toEqual(
      [
        IMNCI_CLASSIFICATION_CODES.PNEUMONIA,
        IMNCI_CLASSIFICATION_CODES.SOME_DEHYDRATION,
      ].sort(),
    );
  });

  it("escalates non-pink classifications to referralRequired when a general danger sign fires", () => {
    const result = classify(
      makeInput({
        answers: {
          "danger.lethargic_unconscious": true,
          "cough.present": true,
          "cough.fast_breathing": true,
        },
      }),
    );

    const danger = result.classifications.find(
      (c) => c.section === IMNCI_SECTIONS.DANGER_SIGNS,
    );
    expect(danger?.severity).toBe("pink");
    expect(danger?.referralRequired).toBe(true);

    const cough = result.classifications.find((c) => c.section === IMNCI_SECTIONS.COUGH);
    expect(cough?.code).toBe(IMNCI_CLASSIFICATION_CODES.PNEUMONIA);
    // post-pass should have promoted this
    expect(cough?.referralRequired).toBe(true);
  });

  it("does not escalate green classifications when a danger sign fires", () => {
    const result = classify(
      makeInput({
        answers: {
          "danger.convulsions": true,
          "cough.present": true,
          // green-only triggers (no fast breathing, no indrawing)
          "cough.fast_breathing": false,
          "cough.chest_indrawing": false,
        },
      }),
    );

    const cough = result.classifications.find((c) => c.section === IMNCI_SECTIONS.COUGH);
    expect(cough?.code).toBe(IMNCI_CLASSIFICATION_CODES.NO_PNEUMONIA);
    expect(cough?.severity).toBe("green");
    expect(cough?.referralRequired).toBe(false);
  });

  it("stops at the first-matching rule per section (priority ordering)", () => {
    // Both pink (severe) AND yellow (pneumonia) triggers active.
    // Severe pneumonia (priority 1) must win — pneumonia rule must not also fire.
    const result = classify(
      makeInput({
        answers: {
          "cough.present": true,
          "cough.fast_breathing": true,
          "cough.chest_indrawing": true,
        },
      }),
    );

    const coughClassifications = result.classifications.filter(
      (c) => c.section === IMNCI_SECTIONS.COUGH,
    );
    expect(coughClassifications).toHaveLength(1);
    expect(coughClassifications[0].code).toBe(
      IMNCI_CLASSIFICATION_CODES.SEVERE_PNEUMONIA,
    );
  });
});

describe("pickDoseBand", () => {
  const bands = [
    { minWeightKg: 4, maxWeightKg: 10, doseAmount: 1, doseUnit: "tablet" },
    { minWeightKg: 10, maxWeightKg: 20, doseAmount: 2, doseUnit: "tablet" },
  ];

  it("returns the matching weight band (upper bound exclusive)", () => {
    expect(pickDoseBand(bands, { ageMonths: 24, weightKg: 8 })?.doseAmount).toBe(1);
    expect(pickDoseBand(bands, { ageMonths: 24, weightKg: 10 })?.doseAmount).toBe(2);
    expect(pickDoseBand(bands, { ageMonths: 24, weightKg: 19.9 })?.doseAmount).toBe(2);
  });

  it("returns undefined when weight is unknown but bands require it", () => {
    expect(pickDoseBand(bands, { ageMonths: 24 })).toBeUndefined();
  });

  it("returns undefined when no band fits", () => {
    expect(pickDoseBand(bands, { ageMonths: 24, weightKg: 25 })).toBeUndefined();
  });
});
