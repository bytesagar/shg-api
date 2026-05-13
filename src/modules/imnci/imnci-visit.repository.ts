import { and, asc, desc, eq, gte, inArray, lte, sql, SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  encounters,
  imnci_assessment_answers,
  imnci_follow_ups,
  imnci_referrals,
  imnci_treatment_plan_items,
  imnci_visit_classifications,
  imnci_visits,
  patients,
  persons,
  visits,
} from "@/db/schema";
import { FacilityContext } from "@/context/facility-context";
import { FacilityRepository } from "@/core/facility-repository";
import { IMNCI_ENCOUNTER_TYPE } from "@/constants/imnci";

export interface CreateVisitInput {
  patientId: string;
  bookletId: string;
  pathway: "young_infant" | "sick_child";
  ageMonthsAtVisit: number;
  weightKg?: number;
  tempC?: number;
  muacMm?: number;
  reason?: string;
}

export interface UpsertAnswer {
  questionKey: string;
  valueBool?: boolean | null;
  valueInt?: number | null;
  valueText?: string | null;
}

export interface PersistClassification {
  classificationCode: string;
  severity: "pink" | "yellow" | "green";
  section: string;
  ruleIdSnapshot?: string | null;
  referralRequired: boolean;
}

export interface PersistPlanItem {
  classificationCode: string;
  kind: "drug" | "referral" | "counselling" | "procedure";
  drugCode?: string | null;
  doseAmount?: number | null;
  doseUnit?: string | null;
  frequency?: string | null;
  durationDays?: number | null;
  counsellingKey?: string | null;
}

export class ImnciVisitRepository extends FacilityRepository {
  constructor(context: FacilityContext) {
    super(context, imnci_visits.facilityId);
  }

  /**
   * Creates the universal visit row, the encounter row (type='imnci'), and
   * the imnci_visits row in a single transaction. Returns the IMNCI visit id.
   */
  public async createVisit(input: CreateVisitInput, actorUserId: string) {
    return db.transaction(async (tx) => {
      const today = new Date().toISOString().slice(0, 10);

      const [visitRow] = await tx
        .insert(visits)
        .values({
          date: today,
          reason: input.reason ?? "CB-IMNCI assessment",
          service: "imnci",
          status: "in_progress",
          patientId: input.patientId,
          facilityId: this.context.facilityId,
        })
        .returning({ id: visits.id });

      const [encounterRow] = await tx
        .insert(encounters)
        .values({
          encounterAt: new Date(),
          reason: input.reason ?? "CB-IMNCI assessment",
          service: "imnci",
          status: "in_progress",
          encounterType: IMNCI_ENCOUNTER_TYPE,
          patientId: input.patientId,
          visitId: visitRow.id,
          facilityId: this.context.facilityId,
          createdBy: actorUserId,
        })
        .returning({ id: encounters.id });

      const [imnciVisitRow] = await tx
        .insert(imnci_visits)
        .values({
          facilityId: this.context.facilityId,
          patientId: input.patientId,
          encounterId: encounterRow.id,
          bookletId: input.bookletId,
          pathway: input.pathway,
          ageMonthsAtVisit: input.ageMonthsAtVisit,
          weightKg: input.weightKg,
          tempC: input.tempC,
          muacMm: input.muacMm,
          status: "in_progress",
          startedByUserId: actorUserId,
        })
        .returning();

      return imnciVisitRow;
    });
  }

  public async findById(id: string) {
    const rows = await db
      .select()
      .from(imnci_visits)
      .where(this.withFacilityScope(eq(imnci_visits.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  public async findAnswers(visitId: string) {
    return db
      .select()
      .from(imnci_assessment_answers)
      .where(eq(imnci_assessment_answers.visitId, visitId))
      .orderBy(asc(imnci_assessment_answers.answeredAt));
  }

  public async findClassifications(visitId: string) {
    return db
      .select()
      .from(imnci_visit_classifications)
      .where(eq(imnci_visit_classifications.visitId, visitId))
      .orderBy(asc(imnci_visit_classifications.section));
  }

  public async findPlanItems(visitId: string) {
    return db
      .select()
      .from(imnci_treatment_plan_items)
      .where(eq(imnci_treatment_plan_items.visitId, visitId))
      .orderBy(asc(imnci_treatment_plan_items.classificationCode));
  }

  public async upsertAnswers(
    visitId: string,
    answers: UpsertAnswer[],
    actorUserId: string,
  ) {
    if (answers.length === 0) return;
    await db.insert(imnci_assessment_answers).values(
      answers.map((a) => ({
        visitId,
        questionKey: a.questionKey,
        valueBool: a.valueBool ?? null,
        valueInt: a.valueInt ?? null,
        valueText: a.valueText ?? null,
        answeredByUserId: actorUserId,
      })),
    );
  }

  /**
   * Returns the latest value per questionKey for a visit (latest answeredAt wins).
   */
  public async getLatestAnswers(visitId: string): Promise<
    Record<string, boolean | number | string | null>
  > {
    const rows = await db
      .select()
      .from(imnci_assessment_answers)
      .where(eq(imnci_assessment_answers.visitId, visitId))
      .orderBy(asc(imnci_assessment_answers.answeredAt));

    const latest: Record<string, boolean | number | string | null> = {};
    for (const row of rows) {
      if (row.valueBool !== null) latest[row.questionKey] = row.valueBool;
      else if (row.valueInt !== null) latest[row.questionKey] = row.valueInt;
      else if (row.valueText !== null) latest[row.questionKey] = row.valueText;
      else latest[row.questionKey] = null;
    }
    return latest;
  }

  /**
   * Idempotent classification persistence: replaces all engine-source classifications
   * and all recommended-state plan items in one transaction. Confirmed/overridden/
   * cancelled plan items are preserved.
   */
  public async replaceEngineResults(
    visitId: string,
    classifications: PersistClassification[],
    planItems: PersistPlanItem[],
  ) {
    await db.transaction(async (tx) => {
      await tx
        .delete(imnci_visit_classifications)
        .where(
          and(
            eq(imnci_visit_classifications.visitId, visitId),
            eq(imnci_visit_classifications.source, "engine"),
          ),
        );

      await tx
        .delete(imnci_treatment_plan_items)
        .where(
          and(
            eq(imnci_treatment_plan_items.visitId, visitId),
            eq(imnci_treatment_plan_items.status, "recommended"),
          ),
        );

      if (classifications.length > 0) {
        await tx.insert(imnci_visit_classifications).values(
          classifications.map((c) => ({
            visitId,
            classificationCode: c.classificationCode,
            severity: c.severity,
            section: c.section,
            ruleIdSnapshot: c.ruleIdSnapshot ?? null,
            source: "engine" as const,
            referralRequired: c.referralRequired,
          })),
        );
      }

      if (planItems.length > 0) {
        await tx.insert(imnci_treatment_plan_items).values(
          planItems.map((p) => ({
            visitId,
            classificationCode: p.classificationCode,
            kind: p.kind,
            drugCode: p.drugCode ?? null,
            doseAmount: p.doseAmount ?? null,
            doseUnit: p.doseUnit ?? null,
            frequency: p.frequency ?? null,
            durationDays: p.durationDays ?? null,
            counsellingKey: p.counsellingKey ?? null,
            status: "recommended" as const,
          })),
        );
      }

      await tx
        .update(imnci_visits)
        .set({ status: "classified", classifiedAt: new Date() })
        .where(eq(imnci_visits.id, visitId));
    });
  }

  public async confirmPlanItems(
    visitId: string,
    decisions: Array<{
      id: string;
      status: "confirmed" | "overridden" | "cancelled";
      notes?: string;
    }>,
    actorUserId: string,
  ) {
    return db.transaction(async (tx) => {
      for (const d of decisions) {
        await tx
          .update(imnci_treatment_plan_items)
          .set({
            status: d.status,
            confirmedByUserId: actorUserId,
            confirmedAt: new Date(),
            notes: d.notes ?? null,
          })
          .where(
            and(
              eq(imnci_treatment_plan_items.id, d.id),
              eq(imnci_treatment_plan_items.visitId, visitId),
            ),
          );
      }
      await tx
        .update(imnci_visits)
        .set({
          status: "completed",
          completedAt: new Date(),
          completedByUserId: actorUserId,
        })
        .where(eq(imnci_visits.id, visitId));

      await tx
        .update(encounters)
        .set({ status: "finished" })
        .where(
          eq(
            encounters.id,
            sql`(SELECT encounter_id FROM imnci_visits WHERE id = ${visitId})`,
          ),
        );
    });
  }

  public async createReferral(
    visitId: string,
    input: {
      patientId: string;
      toFacilityId?: string;
      reason: string;
      classifications: unknown;
      preReferralTreatmentGiven?: unknown;
    },
    actorUserId: string,
  ) {
    return db.transaction(async (tx) => {
      const [referral] = await tx
        .insert(imnci_referrals)
        .values({
          facilityId: this.context.facilityId,
          visitId,
          patientId: input.patientId,
          fromFacilityId: this.context.facilityId,
          toFacilityId: input.toFacilityId ?? null,
          reason: input.reason,
          classifications: input.classifications,
          preReferralTreatmentGiven: input.preReferralTreatmentGiven ?? null,
          referredByUserId: actorUserId,
        })
        .returning();

      await tx
        .update(imnci_visits)
        .set({ status: "referred" })
        .where(eq(imnci_visits.id, visitId));

      return referral;
    });
  }

  public async list(params: {
    page: number;
    pageSize: number;
    patientId?: string;
    status?: "in_progress" | "classified" | "completed" | "referred";
    from?: string;
    to?: string;
    classificationCode?: string;
  }) {
    const filters: SQL[] = [];
    if (params.patientId) filters.push(eq(imnci_visits.patientId, params.patientId));
    if (params.status) filters.push(eq(imnci_visits.status, params.status));
    if (params.from) filters.push(gte(imnci_visits.startedAt, new Date(params.from)));
    if (params.to) filters.push(lte(imnci_visits.startedAt, new Date(params.to)));

    let visitIdsForClassification: string[] | undefined;
    if (params.classificationCode) {
      const matches = await db
        .selectDistinct({ visitId: imnci_visit_classifications.visitId })
        .from(imnci_visit_classifications)
        .where(
          eq(
            imnci_visit_classifications.classificationCode,
            params.classificationCode,
          ),
        );
      visitIdsForClassification = matches.map((m) => m.visitId);
      if (visitIdsForClassification.length === 0) {
        return { items: [], page: params.page, pageSize: params.pageSize };
      }
      filters.push(inArray(imnci_visits.id, visitIdsForClassification));
    }

    const where =
      filters.length > 0
        ? this.withFacilityScope(and(...filters))
        : this.withFacilityScope();

    const offset = (params.page - 1) * params.pageSize;
    const items = await db
      .select()
      .from(imnci_visits)
      .where(where)
      .orderBy(desc(imnci_visits.startedAt))
      .limit(params.pageSize)
      .offset(offset);

    return { items, page: params.page, pageSize: params.pageSize };
  }

  public async findPatientForVisit(patientId: string) {
    const rows = await db
      .select({
        patientId: patients.id,
        facilityId: patients.facilityId,
        birthDate: persons.birthDate,
      })
      .from(patients)
      .innerJoin(persons, eq(patients.personId, persons.id))
      .where(
        and(
          eq(patients.id, patientId),
          eq(patients.facilityId, this.context.facilityId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  public async scheduleFollowUps(
    visitId: string,
    items: Array<{
      patientId: string;
      dueOn: string;
      reason: string;
    }>,
  ) {
    if (items.length === 0) return;
    await db.insert(imnci_follow_ups).values(
      items.map((i) => ({
        facilityId: this.context.facilityId,
        visitId,
        patientId: i.patientId,
        dueOn: i.dueOn,
        reason: i.reason,
      })),
    );
  }
}
