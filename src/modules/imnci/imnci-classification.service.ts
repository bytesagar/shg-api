/**
 * IMNCI classification engine — pure functions only.
 *
 * Receives a fully-loaded booklet (rules + formulary) and an answer set,
 * returns the classifications and recommended treatment plan items.
 *
 * No imports from `@db` or `drizzle-orm`. The caller (visit service) is
 * responsible for fetching rules and persisting the result.
 */

import { IMNCI_SECTIONS } from "@/constants/imnci";

// ---------------------------------------------------------------------------
// Predicate AST
// ---------------------------------------------------------------------------

export type ImnciPredicateOp =
  | "="
  | "!="
  | ">"
  | ">="
  | "<"
  | "<="
  | "in"
  | "exists";

export type ImnciPredicate =
  | { and: ImnciPredicate[] }
  | { or: ImnciPredicate[] }
  | { not: ImnciPredicate }
  | { field: string; op: ImnciPredicateOp; value?: unknown };

// ---------------------------------------------------------------------------
// Inputs / outputs
// ---------------------------------------------------------------------------

export type ImnciSeverity = "pink" | "yellow" | "green";

export interface ClassificationRule {
  id: string;
  section: string;
  classificationCode: string;
  severity: ImnciSeverity;
  priority: number;
  predicate: ImnciPredicate;
}

export interface TreatmentRule {
  classificationCode: string;
  actionKind: "drug" | "referral" | "counselling" | "procedure";
  drugCode?: string | null;
  doseTable?: DoseTable | null;
  durationDays?: number | null;
  followUpDays?: number | null;
  counsellingKey?: string | null;
  sequence?: number;
}

export interface FormularyEntry {
  drugCode: string;
  name: string;
  formulation?: string | null;
  weightBandedDoses: WeightBand[];
}

export interface WeightBand {
  minWeightKg?: number;
  maxWeightKg?: number;
  minAgeMonths?: number;
  maxAgeMonths?: number;
  doseAmount: number;
  doseUnit: string;
  frequency?: string;
}

export type DoseTable = WeightBand[];

export type AnswerValue = boolean | number | string | null | undefined;

export interface ClassificationInput {
  patient: {
    ageMonths: number;
    weightKg?: number;
    sex?: "M" | "F";
  };
  answers: Record<string, AnswerValue>;
  rules: ClassificationRule[];
  treatmentRules?: TreatmentRule[];
  formulary?: FormularyEntry[];
}

export interface ClassificationOutcome {
  code: string;
  severity: ImnciSeverity;
  section: string;
  ruleId: string;
  referralRequired: boolean;
}

export interface PlanItemOutcome {
  classificationCode: string;
  kind: TreatmentRule["actionKind"];
  drugCode?: string;
  doseAmount?: number;
  doseUnit?: string;
  frequency?: string;
  durationDays?: number;
  counsellingKey?: string;
}

export interface ClassificationResult {
  classifications: ClassificationOutcome[];
  planItems: PlanItemOutcome[];
}

// ---------------------------------------------------------------------------
// Predicate evaluator
// ---------------------------------------------------------------------------

interface EvalContext {
  patient: ClassificationInput["patient"];
  answers: Record<string, AnswerValue>;
}

function resolveField(path: string, ctx: EvalContext): AnswerValue {
  // Convention:
  //   "patient.<attr>"     → ctx.patient[attr]
  //   "answers.<key>"      → ctx.answers[key]   (key is the full remainder; question keys may contain dots)
  //   "<key>"              → ctx.answers[key]   (bare keys default to answers)
  if (path.startsWith("patient.")) {
    const attr = path.slice("patient.".length);
    return (ctx.patient as unknown as Record<string, AnswerValue>)[attr];
  }
  const key = path.startsWith("answers.") ? path.slice("answers.".length) : path;
  return ctx.answers[key];
}

function compare(op: ImnciPredicateOp, lhs: AnswerValue, rhs: unknown): boolean {
  switch (op) {
    case "exists":
      return lhs !== undefined && lhs !== null;
    case "=":
      return lhs === rhs;
    case "!=":
      return lhs !== rhs;
    case "in":
      return Array.isArray(rhs) && rhs.includes(lhs as never);
    case ">":
    case ">=":
    case "<":
    case "<=": {
      if (typeof lhs !== "number" || typeof rhs !== "number") return false;
      if (op === ">") return lhs > rhs;
      if (op === ">=") return lhs >= rhs;
      if (op === "<") return lhs < rhs;
      return lhs <= rhs;
    }
  }
}

export function evaluatePredicate(
  predicate: ImnciPredicate,
  ctx: EvalContext,
): boolean {
  if ("and" in predicate) return predicate.and.every((p) => evaluatePredicate(p, ctx));
  if ("or" in predicate) return predicate.or.some((p) => evaluatePredicate(p, ctx));
  if ("not" in predicate) return !evaluatePredicate(predicate.not, ctx);
  const lhs = resolveField(predicate.field, ctx);
  return compare(predicate.op, lhs, predicate.value);
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export function classify(input: ClassificationInput): ClassificationResult {
  const ctx: EvalContext = { patient: input.patient, answers: input.answers };

  const bySection = new Map<string, ClassificationRule[]>();
  for (const rule of input.rules) {
    const list = bySection.get(rule.section);
    if (list) list.push(rule);
    else bySection.set(rule.section, [rule]);
  }

  const matches: ClassificationOutcome[] = [];
  for (const [section, rules] of bySection) {
    const sorted = [...rules].sort((a, b) => a.priority - b.priority);
    for (const rule of sorted) {
      if (evaluatePredicate(rule.predicate, ctx)) {
        matches.push({
          section,
          code: rule.classificationCode,
          severity: rule.severity,
          ruleId: rule.id,
          referralRequired: rule.severity === "pink",
        });
        break;
      }
    }
  }

  // Danger-signs post-pass: any pink in danger_signs forces all other
  // non-green classifications to be treated-as-severe for referral.
  const dangerSignPink = matches.some(
    (m) => m.section === IMNCI_SECTIONS.DANGER_SIGNS && m.severity === "pink",
  );
  if (dangerSignPink) {
    for (const m of matches) {
      if (m.severity !== "green") m.referralRequired = true;
    }
  }

  const planItems = buildPlanItems(matches, input);

  return { classifications: matches, planItems };
}

function buildPlanItems(
  classifications: ClassificationOutcome[],
  input: ClassificationInput,
): PlanItemOutcome[] {
  const items: PlanItemOutcome[] = [];
  const treatmentRules = input.treatmentRules ?? [];
  const formularyByCode = new Map<string, FormularyEntry>();
  for (const f of input.formulary ?? []) formularyByCode.set(f.drugCode, f);

  for (const c of classifications) {
    const rules = treatmentRules
      .filter((r) => r.classificationCode === c.code)
      .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

    for (const rule of rules) {
      const item: PlanItemOutcome = {
        classificationCode: c.code,
        kind: rule.actionKind,
        durationDays: rule.durationDays ?? undefined,
        counsellingKey: rule.counsellingKey ?? undefined,
      };

      if (rule.actionKind === "drug" && rule.drugCode) {
        item.drugCode = rule.drugCode;
        const formulary = formularyByCode.get(rule.drugCode);
        const doseTable = rule.doseTable ?? formulary?.weightBandedDoses ?? null;
        const band = pickDoseBand(doseTable, input.patient);
        if (band) {
          item.doseAmount = band.doseAmount;
          item.doseUnit = band.doseUnit;
          item.frequency = band.frequency;
        }
      }

      items.push(item);
    }
  }

  return items;
}

export function pickDoseBand(
  doseTable: DoseTable | null | undefined,
  patient: { ageMonths: number; weightKg?: number },
): WeightBand | undefined {
  if (!doseTable || doseTable.length === 0) return undefined;
  return doseTable.find((band) => {
    if (band.minWeightKg !== undefined) {
      if (patient.weightKg === undefined || patient.weightKg < band.minWeightKg) {
        return false;
      }
    }
    if (band.maxWeightKg !== undefined) {
      if (patient.weightKg === undefined || patient.weightKg >= band.maxWeightKg) {
        return false;
      }
    }
    if (band.minAgeMonths !== undefined && patient.ageMonths < band.minAgeMonths) {
      return false;
    }
    if (band.maxAgeMonths !== undefined && patient.ageMonths >= band.maxAgeMonths) {
      return false;
    }
    return true;
  });
}
