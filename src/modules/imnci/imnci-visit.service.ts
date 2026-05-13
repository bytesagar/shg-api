import { FacilityContext } from "@/context/facility-context";
import { AppError } from "@/utils/app-error";
import { HTTP_STATUS } from "@/config/constants";
import {
  classify,
  type ClassificationRule,
  type FormularyEntry,
  type ImnciPredicate,
  type TreatmentRule,
  type WeightBand,
} from "./imnci-classification.service";
import { ImnciChartBookletRepository } from "./imnci-chart-booklet.repository";
import { ImnciVisitRepository } from "./imnci-visit.repository";
import type {
  ConfirmTreatmentPlanInput,
  CreateReferralInput,
  SaveAnswersInput,
  StartVisitInput,
} from "./imnci.validation";

export class ImnciVisitService {
  private readonly visitRepo: ImnciVisitRepository;
  private readonly bookletRepo: ImnciChartBookletRepository;

  constructor(private readonly context: FacilityContext) {
    this.visitRepo = new ImnciVisitRepository(context);
    this.bookletRepo = new ImnciChartBookletRepository(context);
  }

  public async startVisit(input: StartVisitInput) {
    const patient = await this.loadPatientWithPerson(input.patientId);
    const ageMonths = computeAgeMonths(patient.birthDate);
    if (ageMonths === null) {
      throw new AppError(
        "Patient birth date is unknown; CB-IMNCI requires age",
        HTTP_STATUS.BAD_REQUEST,
      );
    }
    if (ageMonths >= 60) {
      throw new AppError(
        "Patient is not in the CB-IMNCI age range (under 5 years)",
        HTTP_STATUS.BAD_REQUEST,
      );
    }
    const pathway = ageMonths < 2 ? "young_infant" : "sick_child";

    const booklet = await this.bookletRepo.findActiveForFacility();
    if (!booklet) {
      throw new AppError(
        "No active CB-IMNCI booklet configured for this facility",
        HTTP_STATUS.CONFLICT,
      );
    }

    const visit = await this.visitRepo.createVisit(
      {
        patientId: input.patientId,
        bookletId: booklet.id,
        pathway,
        ageMonthsAtVisit: ageMonths,
        weightKg: input.weightKg,
        tempC: input.tempC,
        muacMm: input.muacMm,
        reason: input.reason,
      },
      this.context.userId,
    );

    const questions = await this.bookletRepo.findQuestionsByBooklet(booklet.id);
    const questionsForPathway = questions.filter((q) => q.pathway === pathway);

    return {
      visit,
      booklet: {
        id: booklet.id,
        versionCode: booklet.versionCode,
      },
      pathway,
      ageMonthsAtVisit: ageMonths,
      questions: questionsForPathway.map((q) => ({
        id: q.id,
        key: q.key,
        section: q.section,
        promptKey: q.promptKey,
        prompts: q.prompts,
        inputType: q.inputType,
        options: q.options,
        validation: q.validation,
        displayOrder: q.displayOrder,
      })),
    };
  }

  public async getVisitDetail(visitId: string) {
    const visit = await this.visitRepo.findById(visitId);
    if (!visit) throw new AppError("Visit not found", HTTP_STATUS.NOT_FOUND);

    const [answers, classifications, planItems] = await Promise.all([
      this.visitRepo.findAnswers(visitId),
      this.visitRepo.findClassifications(visitId),
      this.visitRepo.findPlanItems(visitId),
    ]);

    return { visit, answers, classifications, planItems };
  }

  public async saveAnswers(visitId: string, input: SaveAnswersInput) {
    const visit = await this.visitRepo.findById(visitId);
    if (!visit) throw new AppError("Visit not found", HTTP_STATUS.NOT_FOUND);
    if (visit.status === "completed" || visit.status === "referred") {
      throw new AppError(
        "Cannot edit answers on a finalized visit",
        HTTP_STATUS.CONFLICT,
      );
    }

    const rows = input.answers.map((a) => {
      if (typeof a.value === "boolean") {
        return { questionKey: a.questionKey, valueBool: a.value };
      }
      if (typeof a.value === "number") {
        return { questionKey: a.questionKey, valueInt: a.value };
      }
      if (typeof a.value === "string") {
        return { questionKey: a.questionKey, valueText: a.value };
      }
      return { questionKey: a.questionKey };
    });

    await this.visitRepo.upsertAnswers(visitId, rows, this.context.userId);
    return { saved: rows.length };
  }

  public async classifyVisit(visitId: string) {
    const visit = await this.visitRepo.findById(visitId);
    if (!visit) throw new AppError("Visit not found", HTTP_STATUS.NOT_FOUND);
    if (visit.status === "completed") {
      throw new AppError(
        "Visit already completed; classification is locked",
        HTTP_STATUS.CONFLICT,
      );
    }

    const [classificationRowsRaw, treatmentRowsRaw, formularyRowsRaw, answers] =
      await Promise.all([
        this.bookletRepo.findClassificationRulesByBooklet(visit.bookletId),
        this.bookletRepo.findTreatmentRulesByBooklet(visit.bookletId),
        this.bookletRepo.findFormularyByBooklet(visit.bookletId),
        this.visitRepo.getLatestAnswers(visitId),
      ]);

    const rules: ClassificationRule[] = classificationRowsRaw
      .filter((r) => r.pathway === visit.pathway)
      .map((r) => ({
        id: r.id,
        section: r.section,
        classificationCode: r.classificationCode,
        severity: r.severity,
        priority: r.priority,
        predicate: r.predicate as ImnciPredicate,
      }));

    const treatmentRules: TreatmentRule[] = treatmentRowsRaw.map((t) => ({
      classificationCode: t.classificationCode,
      actionKind: t.actionKind,
      drugCode: t.drugCode,
      doseTable: (t.doseTable as WeightBand[] | null) ?? null,
      durationDays: t.durationDays,
      followUpDays: t.followUpDays,
      counsellingKey: t.counsellingKey,
      sequence: t.sequence,
    }));

    const formulary: FormularyEntry[] = formularyRowsRaw.map((f) => ({
      drugCode: f.drugCode,
      name: f.name,
      formulation: f.formulation,
      weightBandedDoses: f.weightBandedDoses as WeightBand[],
    }));

    const result = classify({
      patient: {
        ageMonths: visit.ageMonthsAtVisit,
        weightKg: visit.weightKg ?? undefined,
      },
      answers: answers as Record<string, boolean | number | string | null>,
      rules,
      treatmentRules,
      formulary,
    });

    await this.visitRepo.replaceEngineResults(
      visitId,
      result.classifications.map((c) => ({
        classificationCode: c.code,
        severity: c.severity,
        section: c.section,
        ruleIdSnapshot: c.ruleId,
        referralRequired: c.referralRequired,
      })),
      result.planItems.map((p) => ({
        classificationCode: p.classificationCode,
        kind: p.kind,
        drugCode: p.drugCode,
        doseAmount: p.doseAmount,
        doseUnit: p.doseUnit,
        frequency: p.frequency,
        durationDays: p.durationDays,
        counsellingKey: p.counsellingKey,
      })),
    );

    const [classifications, planItems] = await Promise.all([
      this.visitRepo.findClassifications(visitId),
      this.visitRepo.findPlanItems(visitId),
    ]);

    return { classifications, planItems };
  }

  public async confirmTreatmentPlan(
    visitId: string,
    input: ConfirmTreatmentPlanInput,
  ) {
    const visit = await this.visitRepo.findById(visitId);
    if (!visit) throw new AppError("Visit not found", HTTP_STATUS.NOT_FOUND);
    if (visit.status !== "classified") {
      throw new AppError(
        "Visit must be classified before confirming the treatment plan",
        HTTP_STATUS.CONFLICT,
      );
    }

    await this.visitRepo.confirmPlanItems(
      visitId,
      input.items,
      this.context.userId,
    );

    // Schedule follow-ups derived from treatment rules with followUpDays set.
    const treatmentRows = await this.bookletRepo.findTreatmentRulesByBooklet(
      visit.bookletId,
    );
    const classifications = await this.visitRepo.findClassifications(visitId);
    const followUps = deriveFollowUps(visit, classifications, treatmentRows);
    if (followUps.length > 0) {
      await this.visitRepo.scheduleFollowUps(visitId, followUps);
    }

    return this.getVisitDetail(visitId);
  }

  public async refer(visitId: string, input: CreateReferralInput) {
    const visit = await this.visitRepo.findById(visitId);
    if (!visit) throw new AppError("Visit not found", HTTP_STATUS.NOT_FOUND);

    const classifications = await this.visitRepo.findClassifications(visitId);
    const hasPink = classifications.some((c) => c.severity === "pink");
    if (!hasPink) {
      throw new AppError(
        "Referral requires at least one pink-severity classification",
        HTTP_STATUS.CONFLICT,
      );
    }

    const referral = await this.visitRepo.createReferral(
      visitId,
      {
        patientId: visit.patientId,
        toFacilityId: input.toFacilityId,
        reason: input.reason,
        classifications: classifications.map((c) => ({
          code: c.classificationCode,
          severity: c.severity,
          section: c.section,
        })),
        preReferralTreatmentGiven: input.preReferralTreatmentGiven,
      },
      this.context.userId,
    );

    return referral;
  }

  public async listVisits(params: {
    page: number;
    pageSize: number;
    patientId?: string;
    status?: "in_progress" | "classified" | "completed" | "referred";
    from?: string;
    to?: string;
    classificationCode?: string;
  }) {
    return this.visitRepo.list(params);
  }

  private async loadPatientWithPerson(patientId: string) {
    const row = await this.visitRepo.findPatientForVisit(patientId);
    if (!row) {
      throw new AppError("Patient not found", HTTP_STATUS.NOT_FOUND);
    }
    return row;
  }
}

function computeAgeMonths(birthDate: Date | null): number | null {
  if (!birthDate) return null;
  const now = new Date();
  const years = now.getFullYear() - birthDate.getFullYear();
  const months = now.getMonth() - birthDate.getMonth();
  const days = now.getDate() - birthDate.getDate();
  let total = years * 12 + months;
  if (days < 0) total -= 1;
  return Math.max(total, 0);
}

function deriveFollowUps(
  visit: { patientId: string },
  classifications: Array<{ classificationCode: string; severity: string }>,
  treatmentRules: Array<{
    classificationCode: string;
    followUpDays: number | null;
  }>,
) {
  const today = new Date();
  const items: Array<{ patientId: string; dueOn: string; reason: string }> = [];
  const seen = new Set<string>();

  for (const c of classifications) {
    // Pink classifications get referred elsewhere; skip the FU.
    if (c.severity === "pink") continue;
    const rule = treatmentRules.find(
      (t) => t.classificationCode === c.classificationCode && t.followUpDays !== null,
    );
    if (!rule || rule.followUpDays == null) continue;
    const due = new Date(today);
    due.setDate(due.getDate() + rule.followUpDays);
    const dueOn = due.toISOString().slice(0, 10);
    const key = `${c.classificationCode}:${dueOn}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      patientId: visit.patientId,
      dueOn,
      reason: c.classificationCode,
    });
  }
  return items;
}
