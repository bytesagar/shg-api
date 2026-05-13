import { createHash } from "crypto";
import { FacilityContext } from "@/context/facility-context";
import { AppError } from "@/utils/app-error";
import { HTTP_STATUS } from "@/config/constants";
import { ImnciChartBookletRepository } from "./imnci-chart-booklet.repository";
import type {
  ClassificationRule,
  FormularyEntry,
  ImnciPredicate,
  TreatmentRule,
  WeightBand,
} from "./imnci-classification.service";

export interface BookletBundle {
  booklet: {
    id: string;
    versionCode: string;
    country: string;
    effectiveFrom: string;
    status: string;
  };
  questions: Array<{
    id: string;
    key: string;
    pathway: string;
    section: string;
    promptKey: string;
    prompts: unknown;
    inputType: string;
    options: unknown;
    validation: unknown;
    displayOrder: number;
  }>;
  classificationRules: ClassificationRule[];
  treatmentRules: TreatmentRule[];
  formulary: FormularyEntry[];
  counselling: Array<{
    key: string;
    classificationCode: string | null;
    language: string;
    body: string;
  }>;
}

export interface BookletBundleResponse {
  bundle: BookletBundle;
  etag: string;
}

export class ImnciChartBookletService {
  private readonly repo: ImnciChartBookletRepository;

  constructor(private readonly context: FacilityContext) {
    this.repo = new ImnciChartBookletRepository(context);
  }

  public async getActiveBookletSummary() {
    const booklet = await this.repo.findActiveForFacility();
    if (!booklet) {
      throw new AppError(
        "No active CB-IMNCI booklet configured for this facility",
        HTTP_STATUS.NOT_FOUND,
      );
    }
    return {
      id: booklet.id,
      versionCode: booklet.versionCode,
      country: booklet.country,
      effectiveFrom: booklet.effectiveFrom,
      status: booklet.status,
    };
  }

  public async getBookletBundle(id: string): Promise<BookletBundleResponse> {
    const booklet = await this.repo.findBookletById(id);
    if (!booklet) {
      throw new AppError("Booklet not found", HTTP_STATUS.NOT_FOUND);
    }

    const [questions, classificationRows, treatmentRows, formularyRows, counsellingRows] =
      await Promise.all([
        this.repo.findQuestionsByBooklet(id),
        this.repo.findClassificationRulesByBooklet(id),
        this.repo.findTreatmentRulesByBooklet(id),
        this.repo.findFormularyByBooklet(id),
        this.repo.findCounsellingByBooklet(id),
      ]);

    const bundle: BookletBundle = {
      booklet: {
        id: booklet.id,
        versionCode: booklet.versionCode,
        country: booklet.country,
        effectiveFrom: booklet.effectiveFrom,
        status: booklet.status,
      },
      questions: questions.map((q) => ({
        id: q.id,
        key: q.key,
        pathway: q.pathway,
        section: q.section,
        promptKey: q.promptKey,
        prompts: q.prompts,
        inputType: q.inputType,
        options: q.options,
        validation: q.validation,
        displayOrder: q.displayOrder,
      })),
      classificationRules: classificationRows.map((r) => ({
        id: r.id,
        section: r.section,
        classificationCode: r.classificationCode,
        severity: r.severity,
        priority: r.priority,
        predicate: r.predicate as ImnciPredicate,
      })),
      treatmentRules: treatmentRows.map((t) => ({
        classificationCode: t.classificationCode,
        actionKind: t.actionKind,
        drugCode: t.drugCode,
        doseTable: (t.doseTable as WeightBand[] | null) ?? null,
        durationDays: t.durationDays,
        followUpDays: t.followUpDays,
        counsellingKey: t.counsellingKey,
        sequence: t.sequence,
      })),
      formulary: formularyRows.map((f) => ({
        drugCode: f.drugCode,
        name: f.name,
        formulation: f.formulation,
        weightBandedDoses: f.weightBandedDoses as WeightBand[],
      })),
      counselling: counsellingRows.map((c) => ({
        key: c.key,
        classificationCode: c.classificationCode,
        language: c.language,
        body: c.body,
      })),
    };

    return { bundle, etag: computeEtag(bundle) };
  }

  public async getFormularyBundle(bookletId: string) {
    const booklet = await this.repo.findBookletById(bookletId);
    if (!booklet) {
      throw new AppError("Booklet not found", HTTP_STATUS.NOT_FOUND);
    }
    const rows = await this.repo.findFormularyByBooklet(bookletId);
    const formulary = rows.map((f) => ({
      drugCode: f.drugCode,
      name: f.name,
      formulation: f.formulation,
      weightBandedDoses: f.weightBandedDoses as WeightBand[],
    }));
    return { formulary, etag: computeEtag(formulary) };
  }
}

function computeEtag(payload: unknown): string {
  const hash = createHash("sha1").update(JSON.stringify(payload)).digest("hex");
  return `"${hash}"`;
}
