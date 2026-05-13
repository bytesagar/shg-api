/**
 * Content-diff seeder for the CB-IMNCI booklet stub. The booklet row is
 * created on first run; subsequent runs only insert rows that don't already
 * exist, keyed by each table's natural identity:
 *
 *   questions:           (bookletId, key)
 *   classification rules:(bookletId, classificationCode)
 *   formulary:           (bookletId, drugCode)
 *   counselling:         (bookletId, key, language)
 *   treatment rules:     (bookletId, classificationCode, actionKind, sequence)
 *
 * This lets us evolve the seed (e.g. add SYI content to an existing dev DB)
 * without bumping the booklet version or wiping data.
 */

import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../index";
import {
  imnci_chart_booklets,
  imnci_questions,
  imnci_classification_rules,
  imnci_treatment_rules,
  imnci_formulary,
  imnci_counselling_messages,
} from "../../schema";
import { CB_IMNCI_NP_STUB } from "./booklet";

export async function seedImnciBookletStub(): Promise<void> {
  const bookletId = await ensureBookletRow();

  const inserted = {
    questions: await seedQuestions(bookletId),
    classificationRules: await seedClassificationRules(bookletId),
    formulary: await seedFormulary(bookletId),
    treatmentRules: await seedTreatmentRules(bookletId),
    counselling: await seedCounselling(bookletId),
  };

  const totalInserted = Object.values(inserted).reduce((n, v) => n + v, 0);
  if (totalInserted === 0) {
    console.log(
      `✅ IMNCI booklet stub already up to date (${CB_IMNCI_NP_STUB.versionCode})`,
    );
  } else {
    console.log(
      `✅ IMNCI booklet stub: ${CB_IMNCI_NP_STUB.versionCode} — inserted ` +
        `${inserted.questions} questions, ${inserted.classificationRules} rules, ` +
        `${inserted.formulary} formulary, ${inserted.treatmentRules} treatments, ` +
        `${inserted.counselling} counselling`,
    );
  }
}

async function ensureBookletRow(): Promise<string> {
  const existing = await db
    .select({ id: imnci_chart_booklets.id })
    .from(imnci_chart_booklets)
    .where(
      and(
        eq(imnci_chart_booklets.versionCode, CB_IMNCI_NP_STUB.versionCode),
        isNull(imnci_chart_booklets.facilityId),
        isNull(imnci_chart_booklets.municipalityId),
      ),
    )
    .limit(1);

  if (existing[0]) return existing[0].id;

  const [created] = await db
    .insert(imnci_chart_booklets)
    .values({
      versionCode: CB_IMNCI_NP_STUB.versionCode,
      country: CB_IMNCI_NP_STUB.country,
      effectiveFrom: CB_IMNCI_NP_STUB.effectiveFrom,
      status: "active",
      notes: CB_IMNCI_NP_STUB.notes,
    })
    .returning({ id: imnci_chart_booklets.id });
  return created.id;
}

async function seedQuestions(bookletId: string): Promise<number> {
  const existing = await db
    .select({ key: imnci_questions.key })
    .from(imnci_questions)
    .where(eq(imnci_questions.bookletId, bookletId));
  const have = new Set(existing.map((r) => r.key));
  const missing = CB_IMNCI_NP_STUB.questions.filter((q) => !have.has(q.key));
  if (missing.length === 0) return 0;
  await db.insert(imnci_questions).values(
    missing.map((q) => ({
      bookletId,
      key: q.key,
      pathway: q.pathway,
      section: q.section,
      promptKey: q.promptKey,
      prompts: q.prompts,
      inputType: q.inputType,
      options: q.options ?? null,
      validation: q.validation ?? null,
      displayOrder: q.displayOrder,
    })),
  );
  return missing.length;
}

async function seedClassificationRules(bookletId: string): Promise<number> {
  const existing = await db
    .select({ code: imnci_classification_rules.classificationCode })
    .from(imnci_classification_rules)
    .where(eq(imnci_classification_rules.bookletId, bookletId));
  const have = new Set(existing.map((r) => r.code));
  const missing = CB_IMNCI_NP_STUB.classificationRules.filter(
    (r) => !have.has(r.classificationCode),
  );
  if (missing.length === 0) return 0;
  await db.insert(imnci_classification_rules).values(
    missing.map((r) => ({
      bookletId,
      pathway: r.pathway,
      section: r.section,
      classificationCode: r.classificationCode,
      severity: r.severity,
      priority: r.priority,
      predicate: r.predicate,
      notes: r.notes ?? null,
    })),
  );
  return missing.length;
}

async function seedFormulary(bookletId: string): Promise<number> {
  const existing = await db
    .select({ drugCode: imnci_formulary.drugCode })
    .from(imnci_formulary)
    .where(eq(imnci_formulary.bookletId, bookletId));
  const have = new Set(existing.map((r) => r.drugCode));
  const missing = CB_IMNCI_NP_STUB.formulary.filter(
    (f) => !have.has(f.drugCode),
  );
  if (missing.length === 0) return 0;
  await db.insert(imnci_formulary).values(
    missing.map((f) => ({
      bookletId,
      drugCode: f.drugCode,
      name: f.name,
      formulation: f.formulation,
      weightBandedDoses: f.weightBandedDoses,
    })),
  );
  return missing.length;
}

function treatmentKey(t: {
  classificationCode: string;
  actionKind: string;
  sequence: number;
}): string {
  return `${t.classificationCode}|${t.actionKind}|${t.sequence}`;
}

async function seedTreatmentRules(bookletId: string): Promise<number> {
  const existing = await db
    .select({
      code: imnci_treatment_rules.classificationCode,
      kind: imnci_treatment_rules.actionKind,
      seq: imnci_treatment_rules.sequence,
    })
    .from(imnci_treatment_rules)
    .where(eq(imnci_treatment_rules.bookletId, bookletId));
  const have = new Set(
    existing.map((r) =>
      treatmentKey({
        classificationCode: r.code,
        actionKind: r.kind,
        sequence: r.seq,
      }),
    ),
  );
  const missing = CB_IMNCI_NP_STUB.treatmentRules.filter(
    (t) => !have.has(treatmentKey(t)),
  );
  if (missing.length === 0) return 0;
  await db.insert(imnci_treatment_rules).values(
    missing.map((t) => ({
      bookletId,
      classificationCode: t.classificationCode,
      actionKind: t.actionKind,
      drugCode: t.drugCode ?? null,
      doseTable: t.doseTable ?? null,
      durationDays: t.durationDays ?? null,
      followUpDays: t.followUpDays ?? null,
      counsellingKey: t.counsellingKey ?? null,
      sequence: t.sequence,
    })),
  );
  return missing.length;
}

function counsellingKey(c: { key: string; language: string }): string {
  return `${c.key}|${c.language}`;
}

async function seedCounselling(bookletId: string): Promise<number> {
  const existing = await db
    .select({
      key: imnci_counselling_messages.key,
      language: imnci_counselling_messages.language,
    })
    .from(imnci_counselling_messages)
    .where(eq(imnci_counselling_messages.bookletId, bookletId));
  const have = new Set(existing.map((r) => counsellingKey(r)));
  const missing = CB_IMNCI_NP_STUB.counselling.filter(
    (c) => !have.has(counsellingKey(c)),
  );
  if (missing.length === 0) return 0;
  await db.insert(imnci_counselling_messages).values(
    missing.map((c) => ({
      bookletId,
      key: c.key,
      classificationCode: c.classificationCode ?? null,
      language: c.language,
      body: c.body,
    })),
  );
  return missing.length;
}
