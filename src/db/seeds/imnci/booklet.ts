/**
 * Minimal CB-IMNCI Nepal booklet stub.
 *
 * NOT clinically reviewed — this is a placeholder so the engine can be exercised
 * end-to-end against real DB rows. Real CB-IMNCI content (MoHP 2014 chart booklet)
 * must replace this before any clinical use; tracked in plan §10.1.
 */

import type {
  ImnciPredicate,
  ImnciSeverity,
  WeightBand,
} from "@/modules/imnci/imnci-classification.service";
import { IMNCI_SECTIONS, IMNCI_CLASSIFICATION_CODES } from "@/constants/imnci";

export interface SeedQuestion {
  key: string;
  pathway: "sick_child" | "young_infant";
  section: string;
  promptKey: string;
  prompts: { en: string; ne: string };
  inputType: "bool" | "int" | "enum" | "text";
  displayOrder: number;
  options?: unknown;
  validation?: unknown;
}

export interface SeedClassificationRule {
  pathway: "sick_child" | "young_infant";
  section: string;
  classificationCode: string;
  severity: ImnciSeverity;
  priority: number;
  predicate: ImnciPredicate;
  notes?: string;
}

export interface SeedTreatmentRule {
  classificationCode: string;
  actionKind: "drug" | "referral" | "counselling" | "procedure";
  drugCode?: string;
  doseTable?: WeightBand[];
  durationDays?: number;
  followUpDays?: number;
  counsellingKey?: string;
  sequence: number;
}

export interface SeedFormularyEntry {
  drugCode: string;
  name: string;
  formulation: string;
  weightBandedDoses: WeightBand[];
}

export interface SeedCounsellingMessage {
  key: string;
  classificationCode?: string;
  language: "en" | "ne";
  body: string;
}

export interface SeedBooklet {
  versionCode: string;
  country: string;
  effectiveFrom: string;
  notes: string;
  questions: SeedQuestion[];
  classificationRules: SeedClassificationRule[];
  treatmentRules: SeedTreatmentRule[];
  formulary: SeedFormularyEntry[];
  counselling: SeedCounsellingMessage[];
}

const SICK_CHILD = "sick_child" as const;
const YOUNG_INFANT = "young_infant" as const;

export const CB_IMNCI_NP_STUB: SeedBooklet = {
  versionCode: "NP-CB-IMNCI-2014-STUB",
  country: "NP",
  effectiveFrom: "2014-01-01",
  notes:
    "Placeholder stub for CB-IMNCI Nepal. Not clinically reviewed; replace before clinical use.",

  questions: [
    {
      key: "danger.not_able_to_drink",
      pathway: SICK_CHILD,
      section: IMNCI_SECTIONS.DANGER_SIGNS,
      promptKey: "imnci.danger.not_able_to_drink",
      prompts: {
        en: "Is the child not able to drink or breastfeed?",
        ne: "बच्चाले पिउन वा स्तनपान गर्न सक्दैन?",
      },
      inputType: "bool",
      displayOrder: 1,
    },
    {
      key: "danger.vomits_everything",
      pathway: SICK_CHILD,
      section: IMNCI_SECTIONS.DANGER_SIGNS,
      promptKey: "imnci.danger.vomits_everything",
      prompts: {
        en: "Does the child vomit everything?",
        ne: "बच्चाले खाएको सबै बान्ता गर्छ?",
      },
      inputType: "bool",
      displayOrder: 2,
    },
    {
      key: "danger.convulsions",
      pathway: SICK_CHILD,
      section: IMNCI_SECTIONS.DANGER_SIGNS,
      promptKey: "imnci.danger.convulsions",
      prompts: {
        en: "Has the child had convulsions?",
        ne: "बच्चालाई काँपेको थियो?",
      },
      inputType: "bool",
      displayOrder: 3,
    },
    {
      key: "danger.lethargic_unconscious",
      pathway: SICK_CHILD,
      section: IMNCI_SECTIONS.DANGER_SIGNS,
      promptKey: "imnci.danger.lethargic_unconscious",
      prompts: {
        en: "Is the child lethargic or unconscious?",
        ne: "बच्चा सुस्त वा बेहोस छ?",
      },
      inputType: "bool",
      displayOrder: 4,
    },
    {
      key: "cough.present",
      pathway: SICK_CHILD,
      section: IMNCI_SECTIONS.COUGH,
      promptKey: "imnci.cough.present",
      prompts: {
        en: "Does the child have cough or difficult breathing?",
        ne: "बच्चालाई खोकी वा सास फेर्न गाह्रो छ?",
      },
      inputType: "bool",
      displayOrder: 10,
    },
    {
      key: "cough.fast_breathing",
      pathway: SICK_CHILD,
      section: IMNCI_SECTIONS.COUGH,
      promptKey: "imnci.cough.fast_breathing",
      prompts: {
        en: "Does the child have fast breathing?",
        ne: "बच्चाले छिटो सास फेर्छ?",
      },
      inputType: "bool",
      displayOrder: 11,
    },
    {
      key: "cough.chest_indrawing",
      pathway: SICK_CHILD,
      section: IMNCI_SECTIONS.COUGH,
      promptKey: "imnci.cough.chest_indrawing",
      prompts: {
        en: "Is there chest indrawing?",
        ne: "छाती भित्र तानिएको छ?",
      },
      inputType: "bool",
      displayOrder: 12,
    },
    {
      key: "cough.stridor",
      pathway: SICK_CHILD,
      section: IMNCI_SECTIONS.COUGH,
      promptKey: "imnci.cough.stridor",
      prompts: {
        en: "Is there stridor in a calm child?",
        ne: "बच्चा शान्त हुँदा स्ट्राइडर सुनिन्छ?",
      },
      inputType: "bool",
      displayOrder: 13,
    },
    {
      key: "diarrhoea.present",
      pathway: SICK_CHILD,
      section: IMNCI_SECTIONS.DIARRHOEA,
      promptKey: "imnci.diarrhoea.present",
      prompts: {
        en: "Does the child have diarrhoea?",
        ne: "बच्चालाई पखाला लागेको छ?",
      },
      inputType: "bool",
      displayOrder: 20,
    },
    {
      key: "diarrhoea.restless_irritable",
      pathway: SICK_CHILD,
      section: IMNCI_SECTIONS.DIARRHOEA,
      promptKey: "imnci.diarrhoea.restless_irritable",
      prompts: {
        en: "Is the child restless or irritable?",
        ne: "बच्चा अशान्त वा चिड्चिडाएको छ?",
      },
      inputType: "bool",
      displayOrder: 21,
    },
    {
      key: "diarrhoea.sunken_eyes",
      pathway: SICK_CHILD,
      section: IMNCI_SECTIONS.DIARRHOEA,
      promptKey: "imnci.diarrhoea.sunken_eyes",
      prompts: {
        en: "Are the eyes sunken?",
        ne: "आँखा भित्र गाडिएको छ?",
      },
      inputType: "bool",
      displayOrder: 22,
    },
    {
      key: "diarrhoea.skin_pinch_very_slow",
      pathway: SICK_CHILD,
      section: IMNCI_SECTIONS.DIARRHOEA,
      promptKey: "imnci.diarrhoea.skin_pinch_very_slow",
      prompts: {
        en: "Does the skin pinch go back very slowly (>2s)?",
        ne: "छाला चिमोट्दा फर्किन धेरै ढिलो लाग्छ (>२ सेकेन्ड)?",
      },
      inputType: "bool",
      displayOrder: 23,
    },
    {
      key: "diarrhoea.lethargic",
      pathway: SICK_CHILD,
      section: IMNCI_SECTIONS.DIARRHOEA,
      promptKey: "imnci.diarrhoea.lethargic",
      prompts: {
        en: "Is the child lethargic from diarrhoea?",
        ne: "पखालाले बच्चा सुस्त भएको छ?",
      },
      inputType: "bool",
      displayOrder: 24,
    },
    // ---- young_infant (0 – 2 months) ----
    {
      key: "psbi.not_feeding_well",
      pathway: YOUNG_INFANT,
      section: IMNCI_SECTIONS.PSBI,
      promptKey: "imnci.psbi.not_feeding_well",
      prompts: {
        en: "Is the young infant not feeding well?",
        ne: "नवजात शिशुले राम्ररी दूध चुस्दैन?",
      },
      inputType: "bool",
      displayOrder: 100,
    },
    {
      key: "psbi.convulsions",
      pathway: YOUNG_INFANT,
      section: IMNCI_SECTIONS.PSBI,
      promptKey: "imnci.psbi.convulsions",
      prompts: {
        en: "Has the infant had convulsions?",
        ne: "नवजात शिशुलाई काँपेको थियो?",
      },
      inputType: "bool",
      displayOrder: 101,
    },
    {
      key: "psbi.fast_breathing_60",
      pathway: YOUNG_INFANT,
      section: IMNCI_SECTIONS.PSBI,
      promptKey: "imnci.psbi.fast_breathing_60",
      prompts: {
        en: "Is the infant breathing 60 times per minute or more?",
        ne: "नवजात शिशुले एक मिनेटमा ६० पटक वा बढी सास फेर्छ?",
      },
      inputType: "bool",
      displayOrder: 102,
    },
    {
      key: "psbi.severe_chest_indrawing",
      pathway: YOUNG_INFANT,
      section: IMNCI_SECTIONS.PSBI,
      promptKey: "imnci.psbi.severe_chest_indrawing",
      prompts: {
        en: "Is there severe chest indrawing?",
        ne: "छाती गहिरो रूपमा भित्र तानिन्छ?",
      },
      inputType: "bool",
      displayOrder: 103,
    },
    {
      key: "psbi.temperature_high",
      pathway: YOUNG_INFANT,
      section: IMNCI_SECTIONS.PSBI,
      promptKey: "imnci.psbi.temperature_high",
      prompts: {
        en: "Is the infant's temperature 37.5°C or higher?",
        ne: "नवजात शिशुको ज्वरो ३७.५°C वा बढी छ?",
      },
      inputType: "bool",
      displayOrder: 104,
    },
    {
      key: "psbi.temperature_low",
      pathway: YOUNG_INFANT,
      section: IMNCI_SECTIONS.PSBI,
      promptKey: "imnci.psbi.temperature_low",
      prompts: {
        en: "Is the infant's temperature below 35.5°C?",
        ne: "नवजात शिशुको तापक्रम ३५.५°C भन्दा कम छ?",
      },
      inputType: "bool",
      displayOrder: 105,
    },
    {
      key: "psbi.movement_reduced",
      pathway: YOUNG_INFANT,
      section: IMNCI_SECTIONS.PSBI,
      promptKey: "imnci.psbi.movement_reduced",
      prompts: {
        en: "Does the infant move only when stimulated or not at all?",
        ne: "नवजात शिशु छुँदा मात्र चल्छ वा बिल्कुलै चल्दैन?",
      },
      inputType: "bool",
      displayOrder: 106,
    },
    {
      key: "jaundice.present",
      pathway: YOUNG_INFANT,
      section: IMNCI_SECTIONS.JAUNDICE,
      promptKey: "imnci.jaundice.present",
      prompts: {
        en: "Does the infant have yellow skin or eyes (jaundice)?",
        ne: "नवजात शिशुको छाला वा आँखा पहेँलो छ (जन्डिस)?",
      },
      inputType: "bool",
      displayOrder: 110,
    },
    {
      key: "jaundice.yellow_palms_or_soles",
      pathway: YOUNG_INFANT,
      section: IMNCI_SECTIONS.JAUNDICE,
      promptKey: "imnci.jaundice.yellow_palms_or_soles",
      prompts: {
        en: "Are the palms or soles yellow?",
        ne: "हत्केला वा पैतालामा पहेँलोपन छ?",
      },
      inputType: "bool",
      displayOrder: 111,
    },
    {
      key: "jaundice.severe_age_window",
      pathway: YOUNG_INFANT,
      section: IMNCI_SECTIONS.JAUNDICE,
      promptKey: "imnci.jaundice.severe_age_window",
      prompts: {
        en: "Did jaundice appear within the first 24 hours, or persist beyond 14 days of age?",
        ne: "जन्डिस २४ घण्टा भित्र देखियो वा १४ दिनभन्दा बढी रहिरह्यो?",
      },
      inputType: "bool",
      displayOrder: 112,
    },
    {
      key: "local.umbilicus_red_or_pus",
      pathway: YOUNG_INFANT,
      section: IMNCI_SECTIONS.LOCAL_BACTERIAL_INFECTION,
      promptKey: "imnci.local.umbilicus_red_or_pus",
      prompts: {
        en: "Is the umbilicus red or draining pus?",
        ne: "नाभी रातो छ वा पीप बगिरहेको छ?",
      },
      inputType: "bool",
      displayOrder: 120,
    },
    {
      key: "local.skin_pustules",
      pathway: YOUNG_INFANT,
      section: IMNCI_SECTIONS.LOCAL_BACTERIAL_INFECTION,
      promptKey: "imnci.local.skin_pustules",
      prompts: {
        en: "Are there skin pustules?",
        ne: "छालामा पीप भएको दाना छ?",
      },
      inputType: "bool",
      displayOrder: 121,
    },
    {
      key: "feeding.problem",
      pathway: YOUNG_INFANT,
      section: IMNCI_SECTIONS.FEEDING_PROBLEM,
      promptKey: "imnci.feeding.problem",
      prompts: {
        en: "Does the infant have any feeding difficulty?",
        ne: "नवजात शिशुलाई दूध चुस्न कुनै समस्या छ?",
      },
      inputType: "bool",
      displayOrder: 130,
    },
    {
      key: "feeding.not_well_attached",
      pathway: YOUNG_INFANT,
      section: IMNCI_SECTIONS.FEEDING_PROBLEM,
      promptKey: "imnci.feeding.not_well_attached",
      prompts: {
        en: "Is the infant not well attached to the breast?",
        ne: "शिशु स्तनमा राम्रोसँग जोडिएको छैन?",
      },
      inputType: "bool",
      displayOrder: 131,
    },
    {
      key: "feeding.not_suckling_effectively",
      pathway: YOUNG_INFANT,
      section: IMNCI_SECTIONS.FEEDING_PROBLEM,
      promptKey: "imnci.feeding.not_suckling_effectively",
      prompts: {
        en: "Is the infant not suckling effectively?",
        ne: "शिशुले प्रभावकारी रूपमा चुस्दैन?",
      },
      inputType: "bool",
      displayOrder: 132,
    },
  ],

  classificationRules: [
    {
      pathway: SICK_CHILD,
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
    {
      pathway: SICK_CHILD,
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
      pathway: SICK_CHILD,
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
      pathway: SICK_CHILD,
      section: IMNCI_SECTIONS.COUGH,
      classificationCode: IMNCI_CLASSIFICATION_CODES.NO_PNEUMONIA,
      severity: "green",
      priority: 99,
      predicate: { field: "answers.cough.present", op: "=", value: true },
    },
    {
      pathway: SICK_CHILD,
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
              {
                field: "answers.diarrhoea.skin_pinch_very_slow",
                op: "=",
                value: true,
              },
            ],
          },
        ],
      },
    },
    {
      pathway: SICK_CHILD,
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
      pathway: SICK_CHILD,
      section: IMNCI_SECTIONS.DIARRHOEA,
      classificationCode: IMNCI_CLASSIFICATION_CODES.NO_DEHYDRATION,
      severity: "green",
      priority: 99,
      predicate: { field: "answers.diarrhoea.present", op: "=", value: true },
    },
    // ---- young_infant (0 – 2 months) ----
    {
      pathway: YOUNG_INFANT,
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
    },
    {
      pathway: YOUNG_INFANT,
      section: IMNCI_SECTIONS.JAUNDICE,
      classificationCode: IMNCI_CLASSIFICATION_CODES.SEVERE_JAUNDICE,
      severity: "pink",
      priority: 1,
      predicate: {
        and: [
          { field: "answers.jaundice.present", op: "=", value: true },
          {
            or: [
              {
                field: "answers.jaundice.yellow_palms_or_soles",
                op: "=",
                value: true,
              },
              {
                field: "answers.jaundice.severe_age_window",
                op: "=",
                value: true,
              },
            ],
          },
        ],
      },
    },
    {
      pathway: YOUNG_INFANT,
      section: IMNCI_SECTIONS.JAUNDICE,
      classificationCode: IMNCI_CLASSIFICATION_CODES.JAUNDICE,
      severity: "yellow",
      priority: 2,
      predicate: { field: "answers.jaundice.present", op: "=", value: true },
    },
    {
      pathway: YOUNG_INFANT,
      section: IMNCI_SECTIONS.JAUNDICE,
      classificationCode: IMNCI_CLASSIFICATION_CODES.NO_JAUNDICE,
      severity: "green",
      priority: 99,
      predicate: { field: "answers.jaundice.present", op: "=", value: false },
    },
    {
      pathway: YOUNG_INFANT,
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
      pathway: YOUNG_INFANT,
      section: IMNCI_SECTIONS.LOCAL_BACTERIAL_INFECTION,
      classificationCode:
        IMNCI_CLASSIFICATION_CODES.NO_LOCAL_BACTERIAL_INFECTION,
      severity: "green",
      priority: 99,
      predicate: {
        and: [
          {
            field: "answers.local.umbilicus_red_or_pus",
            op: "=",
            value: false,
          },
          { field: "answers.local.skin_pustules", op: "=", value: false },
        ],
      },
    },
    {
      pathway: YOUNG_INFANT,
      section: IMNCI_SECTIONS.FEEDING_PROBLEM,
      classificationCode: IMNCI_CLASSIFICATION_CODES.FEEDING_PROBLEM,
      severity: "yellow",
      priority: 1,
      predicate: {
        or: [
          { field: "answers.feeding.problem", op: "=", value: true },
          { field: "answers.feeding.not_well_attached", op: "=", value: true },
          {
            field: "answers.feeding.not_suckling_effectively",
            op: "=",
            value: true,
          },
        ],
      },
    },
    {
      pathway: YOUNG_INFANT,
      section: IMNCI_SECTIONS.FEEDING_PROBLEM,
      classificationCode: IMNCI_CLASSIFICATION_CODES.NO_FEEDING_PROBLEM,
      severity: "green",
      priority: 99,
      predicate: { field: "answers.feeding.problem", op: "=", value: false },
    },
  ],

  formulary: [
    {
      drugCode: "amoxicillin_dt",
      name: "Amoxicillin DT 250mg",
      formulation: "dispersible tablet",
      weightBandedDoses: [
        {
          minWeightKg: 4,
          maxWeightKg: 10,
          doseAmount: 1,
          doseUnit: "tablet",
          frequency: "BID",
        },
        {
          minWeightKg: 10,
          maxWeightKg: 20,
          doseAmount: 2,
          doseUnit: "tablet",
          frequency: "BID",
        },
      ],
    },
    {
      drugCode: "ors",
      name: "Oral Rehydration Salts",
      formulation: "sachet",
      weightBandedDoses: [
        {
          minAgeMonths: 2,
          maxAgeMonths: 12,
          doseAmount: 100,
          doseUnit: "ml",
          frequency: "after each loose stool",
        },
        {
          minAgeMonths: 12,
          maxAgeMonths: 60,
          doseAmount: 200,
          doseUnit: "ml",
          frequency: "after each loose stool",
        },
      ],
    },
    {
      drugCode: "zinc",
      name: "Zinc 20mg",
      formulation: "dispersible tablet",
      weightBandedDoses: [
        {
          minAgeMonths: 2,
          maxAgeMonths: 60,
          doseAmount: 1,
          doseUnit: "tablet",
          frequency: "OD for 14 days",
        },
      ],
    },
    // ---- young_infant drugs ----
    {
      drugCode: "gentamicin_inj",
      name: "Gentamicin IM 20mg/2ml",
      formulation: "injection",
      weightBandedDoses: [
        // Pre-referral first dose for PSBI in young infants (mg/kg).
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
    {
      drugCode: "chlorhexidine_71",
      name: "Chlorhexidine 7.1% gel",
      formulation: "topical gel",
      weightBandedDoses: [
        {
          minAgeMonths: 0,
          maxAgeMonths: 2,
          doseAmount: 1,
          doseUnit: "application",
          frequency: "OD until cord falls off",
        },
      ],
    },
  ],

  treatmentRules: [
    {
      classificationCode: IMNCI_CLASSIFICATION_CODES.SEVERE_PNEUMONIA,
      actionKind: "drug",
      drugCode: "amoxicillin_dt",
      durationDays: 1,
      sequence: 0,
    },
    {
      classificationCode: IMNCI_CLASSIFICATION_CODES.SEVERE_PNEUMONIA,
      actionKind: "referral",
      sequence: 1,
      counsellingKey: "refer_urgently",
    },
    {
      classificationCode: IMNCI_CLASSIFICATION_CODES.PNEUMONIA,
      actionKind: "drug",
      drugCode: "amoxicillin_dt",
      durationDays: 5,
      followUpDays: 2,
      sequence: 0,
    },
    {
      classificationCode: IMNCI_CLASSIFICATION_CODES.PNEUMONIA,
      actionKind: "counselling",
      counsellingKey: "home_care_cough",
      sequence: 1,
    },
    {
      classificationCode: IMNCI_CLASSIFICATION_CODES.NO_PNEUMONIA,
      actionKind: "counselling",
      counsellingKey: "home_care_cough",
      followUpDays: 5,
      sequence: 0,
    },
    {
      classificationCode: IMNCI_CLASSIFICATION_CODES.SEVERE_DEHYDRATION,
      actionKind: "referral",
      sequence: 0,
      counsellingKey: "refer_urgently",
    },
    {
      classificationCode: IMNCI_CLASSIFICATION_CODES.SOME_DEHYDRATION,
      actionKind: "drug",
      drugCode: "ors",
      durationDays: 1,
      sequence: 0,
    },
    {
      classificationCode: IMNCI_CLASSIFICATION_CODES.SOME_DEHYDRATION,
      actionKind: "drug",
      drugCode: "zinc",
      durationDays: 14,
      sequence: 1,
    },
    {
      classificationCode: IMNCI_CLASSIFICATION_CODES.NO_DEHYDRATION,
      actionKind: "drug",
      drugCode: "zinc",
      durationDays: 14,
      sequence: 0,
    },
    // ---- young_infant treatment ----
    {
      classificationCode: IMNCI_CLASSIFICATION_CODES.PSBI,
      actionKind: "drug",
      drugCode: "gentamicin_inj",
      durationDays: 1,
      sequence: 0,
    },
    {
      classificationCode: IMNCI_CLASSIFICATION_CODES.PSBI,
      actionKind: "drug",
      drugCode: "amoxicillin_syrup_young_infant",
      durationDays: 1,
      sequence: 1,
    },
    {
      classificationCode: IMNCI_CLASSIFICATION_CODES.PSBI,
      actionKind: "referral",
      counsellingKey: "refer_urgently_young_infant",
      sequence: 2,
    },
    {
      classificationCode: IMNCI_CLASSIFICATION_CODES.SEVERE_JAUNDICE,
      actionKind: "referral",
      counsellingKey: "refer_urgently_young_infant",
      sequence: 0,
    },
    {
      classificationCode: IMNCI_CLASSIFICATION_CODES.JAUNDICE,
      actionKind: "counselling",
      counsellingKey: "jaundice_home_care",
      followUpDays: 2,
      sequence: 0,
    },
    {
      classificationCode: IMNCI_CLASSIFICATION_CODES.NO_JAUNDICE,
      actionKind: "counselling",
      counsellingKey: "young_infant_routine_care",
      sequence: 0,
    },
    {
      classificationCode:
        IMNCI_CLASSIFICATION_CODES.LOCAL_BACTERIAL_INFECTION,
      actionKind: "drug",
      drugCode: "amoxicillin_syrup_young_infant",
      durationDays: 5,
      followUpDays: 2,
      sequence: 0,
    },
    {
      classificationCode:
        IMNCI_CLASSIFICATION_CODES.LOCAL_BACTERIAL_INFECTION,
      actionKind: "drug",
      drugCode: "chlorhexidine_71",
      durationDays: 7,
      sequence: 1,
    },
    {
      classificationCode:
        IMNCI_CLASSIFICATION_CODES.LOCAL_BACTERIAL_INFECTION,
      actionKind: "counselling",
      counsellingKey: "cord_skin_care",
      sequence: 2,
    },
    {
      classificationCode:
        IMNCI_CLASSIFICATION_CODES.NO_LOCAL_BACTERIAL_INFECTION,
      actionKind: "counselling",
      counsellingKey: "young_infant_routine_care",
      sequence: 0,
    },
    {
      classificationCode: IMNCI_CLASSIFICATION_CODES.FEEDING_PROBLEM,
      actionKind: "counselling",
      counsellingKey: "feeding_counsel",
      followUpDays: 5,
      sequence: 0,
    },
    {
      classificationCode: IMNCI_CLASSIFICATION_CODES.NO_FEEDING_PROBLEM,
      actionKind: "counselling",
      counsellingKey: "young_infant_routine_care",
      sequence: 0,
    },
  ],

  counselling: [
    {
      key: "refer_urgently",
      language: "en",
      body: "Refer the child urgently to hospital. Give the first dose of antibiotic if applicable. Keep the child warm.",
    },
    {
      key: "refer_urgently",
      language: "ne",
      body: "बच्चालाई तुरुन्तै अस्पताल पठाउनुहोस्। आवश्यक भए एन्टिबायोटिकको पहिलो डोज दिनुहोस्। बच्चालाई न्यानो राख्नुहोस्।",
    },
    {
      key: "home_care_cough",
      language: "en",
      body: "Soothe the throat with a safe remedy. Continue feeding. Return immediately if breathing becomes fast or difficult.",
    },
    {
      key: "home_care_cough",
      language: "ne",
      body: "गलामा सजिलो दिने सुरक्षित उपाय अपनाउनुहोस्। खानपान जारी राख्नुहोस्। सास छिटो वा गाह्रो भएमा तुरुन्तै फर्कनुहोस्।",
    },
    // ---- young_infant counselling ----
    {
      key: "refer_urgently_young_infant",
      language: "en",
      body: "Refer the young infant urgently to hospital. Give the first dose of injectable antibiotic. Keep the infant warm, skin-to-skin, and continue breastfeeding if possible during transit.",
    },
    {
      key: "refer_urgently_young_infant",
      language: "ne",
      body: "नवजात शिशुलाई तुरुन्तै अस्पताल पठाउनुहोस्। इन्जेक्सनको पहिलो डोज दिनुहोस्। शिशुलाई न्यानो राख्न छाला-छुट्ट्याइ अप्नाउनुहोस् र सक्दो स्तनपान जारी राख्नुहोस्।",
    },
    {
      key: "jaundice_home_care",
      language: "en",
      body: "Continue exclusive breastfeeding. Expose the infant to indirect sunlight for short periods. Return in 2 days for follow-up. Return immediately if palms/soles become yellow.",
    },
    {
      key: "jaundice_home_care",
      language: "ne",
      body: "विशेष स्तनपान जारी राख्नुहोस्। थोरै समय अप्रत्यक्ष घामलाई पारिराख्नुहोस्। २ दिनमा फलोअपका लागि फर्कनुहोस्। हत्केला/पैतालामा पहेँलोपन देखिए तुरुन्तै फर्कनुहोस्।",
    },
    {
      key: "cord_skin_care",
      language: "en",
      body: "Apply chlorhexidine to the cord stump daily until it falls off. Keep the cord and skin clean and dry. Return immediately if pus, redness or fever develops.",
    },
    {
      key: "cord_skin_care",
      language: "ne",
      body: "नाभीमा क्लोरहेक्सिडिन दिनहुँ लगाउनुहोस्, झर्ने सम्म। नाभी र छालालाई सफा र सुख्खा राख्नुहोस्। पीप, रातोपन वा ज्वरो देखिए तुरुन्तै फर्कनुहोस्।",
    },
    {
      key: "feeding_counsel",
      language: "en",
      body: "Help the mother position and attach the infant well. Encourage exclusive breastfeeding on demand. Return in 5 days for follow-up.",
    },
    {
      key: "feeding_counsel",
      language: "ne",
      body: "आमालाई शिशु सही ढङ्गले अड्याउन र जोड्न सहयोग गर्नुहोस्। माग अनुसार विशेष स्तनपान गराउन प्रोत्साहन गर्नुहोस्। ५ दिनमा फलोअपका लागि फर्कनुहोस्।",
    },
    {
      key: "young_infant_routine_care",
      language: "en",
      body: "Continue exclusive breastfeeding. Keep the infant warm. Ensure complete immunization. Return immediately if feeding becomes poor, fever appears, or any danger sign is seen.",
    },
    {
      key: "young_infant_routine_care",
      language: "ne",
      body: "विशेष स्तनपान जारी राख्नुहोस्। शिशुलाई न्यानो राख्नुहोस्। पूर्ण खोप सुनिश्चित गर्नुहोस्। दूध चुस्न समस्या, ज्वरो, वा कुनै खतराको चिन्ह देखिए तुरुन्तै फर्कनुहोस्।",
    },
  ],
};
