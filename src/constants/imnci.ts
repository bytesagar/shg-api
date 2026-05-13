export const IMNCI_ENCOUNTER_TYPE = "imnci";

export const IMNCI_SECTIONS = {
  // sick_child (2 months – 5 years)
  DANGER_SIGNS: "danger_signs",
  COUGH: "cough",
  DIARRHOEA: "diarrhoea",
  FEVER: "fever",
  EAR: "ear",
  MALNUTRITION: "malnutrition",
  ANAEMIA: "anaemia",
  IMMUNIZATION: "immunization",
  // young_infant (0 – 2 months)
  PSBI: "psbi",
  JAUNDICE: "jaundice",
  LOCAL_BACTERIAL_INFECTION: "local_bacterial_infection",
  FEEDING_PROBLEM: "feeding_problem",
} as const;

export type ImnciSection = (typeof IMNCI_SECTIONS)[keyof typeof IMNCI_SECTIONS];

export const IMNCI_CLASSIFICATION_CODES = {
  // sick_child / cough
  SEVERE_PNEUMONIA: "SEVERE_PNEUMONIA",
  PNEUMONIA: "PNEUMONIA",
  NO_PNEUMONIA: "NO_PNEUMONIA",
  // sick_child / diarrhoea
  SEVERE_DEHYDRATION: "SEVERE_DEHYDRATION",
  SOME_DEHYDRATION: "SOME_DEHYDRATION",
  NO_DEHYDRATION: "NO_DEHYDRATION",
  // sick_child / danger signs
  GENERAL_DANGER_SIGN: "GENERAL_DANGER_SIGN",
  // young_infant
  PSBI: "PSBI",
  SEVERE_JAUNDICE: "SEVERE_JAUNDICE",
  JAUNDICE: "JAUNDICE",
  NO_JAUNDICE: "NO_JAUNDICE",
  LOCAL_BACTERIAL_INFECTION: "LOCAL_BACTERIAL_INFECTION",
  NO_LOCAL_BACTERIAL_INFECTION: "NO_LOCAL_BACTERIAL_INFECTION",
  FEEDING_PROBLEM: "FEEDING_PROBLEM",
  NO_FEEDING_PROBLEM: "NO_FEEDING_PROBLEM",
} as const;

export const IMNCI_FCHV_COMMODITIES = [
  "ors",
  "zinc",
  "iron",
  "chlorhexidine",
  "misoprostol",
  "other",
] as const;
