import { db } from "../../db";
import { FacilityContext } from "../../context/facility-context";
import { VisitRepository } from "../clinical-visits/visit.repository";
import { MaternalHealthRepository } from "./maternal-health.repository";
import {
  AamaIncentivePatchInput,
  AntenatalCareCreateInput,
  DeliveryCreateInput,
  FacilityPopulationTargetUpsertInput,
  MaternalDeathCreateInput,
  NewbornDeathCreateInput,
  PostAbortionCareCreateInput,
  PostnatalCareCreateInput,
  PregnancyComplicationCreateInput,
  PregnancyCreateInput,
  PreviousPregnancyItemInput,
  SafeAbortionComplicationCreateInput,
  SafeAbortionCreateInput,
  ScreeningPatchInput,
  TdDosesPatchInput,
} from "./maternal-health.validation";

// HMIS 2082 protocol visit windows (gestational age in weeks, inclusive).
// Source: HMIS 3.5 / 3.6 register, 8-visit ANC protocol.
const ANC_PROTOCOL_WINDOWS: Array<{
  code: "ANC1" | "ANC2" | "ANC3" | "ANC4" | "ANC5" | "ANC6" | "ANC7" | "ANC8";
  min: number;
  max: number;
}> = [
  { code: "ANC1", min: 0, max: 12 },
  { code: "ANC2", min: 13, max: 16 },
  { code: "ANC3", min: 20, max: 24 },
  { code: "ANC4", min: 28, max: 28 },
  { code: "ANC5", min: 32, max: 32 },
  { code: "ANC6", min: 34, max: 34 },
  { code: "ANC7", min: 36, max: 36 },
  { code: "ANC8", min: 38, max: 40 },
];

function deriveAncProtocolFromWeeks(
  weeks: number,
): "ANC1" | "ANC2" | "ANC3" | "ANC4" | "ANC5" | "ANC6" | "ANC7" | "ANC8" {
  // Exact-window match first; otherwise pick the nearest scheduled visit.
  for (const w of ANC_PROTOCOL_WINDOWS) {
    if (weeks >= w.min && weeks <= w.max) return w.code;
  }
  // Gaps (17-19, 25-27, 29-31, 33, 35, 37) — snap to nearest later window.
  if (weeks < 0) return "ANC1";
  if (weeks <= 19) return "ANC2";
  if (weeks <= 27) return "ANC3";
  if (weeks <= 31) return "ANC4";
  if (weeks <= 33) return "ANC5";
  if (weeks <= 35) return "ANC6";
  if (weeks <= 37) return "ANC7";
  return "ANC8";
}

function weeksBetween(
  fromIsoDate: string,
  toIsoDate: string,
): number {
  const ms =
    new Date(toIsoDate).getTime() - new Date(fromIsoDate).getTime();
  return Math.floor(ms / (7 * 24 * 60 * 60 * 1000));
}

function computeEddFromLmp(lmpIsoDate: string): string {
  // EDD = LMP + 280 days (Naegele's rule, also what HMIS describes as
  // "LMP + 9 months 7 days").
  const lmp = new Date(lmpIsoDate);
  const edd = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000);
  return edd.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export class MaternalHealthService {
  private readonly visitRepository: VisitRepository;
  private readonly maternalHealthRepository: MaternalHealthRepository;

  constructor(private readonly context: FacilityContext) {
    this.visitRepository = new VisitRepository(context);
    this.maternalHealthRepository = new MaternalHealthRepository(context);
  }

  private async requireActiveVisit(visitId: string) {
    const visit = await this.visitRepository.findById(visitId);
    if (!visit) return { error: "VISIT_NOT_FOUND" as const };
    if (visit.status === "finished" || visit.status === "cancelled") {
      return { error: "VISIT_NOT_ACTIVE" as const };
    }
    return { visit };
  }

  public async createPregnancy(
    input: { visitId: string } & PregnancyCreateInput,
  ) {
    const visitResult = await this.requireActiveVisit(input.visitId);
    if ("error" in visitResult) return visitResult;

    const { visit } = visitResult;

    // Auto-compute EDD from LMP when caller omitted it.
    const lmp = input.lastMenstruationPeriod ?? null;
    const edd =
      input.expectedDeliveryDate ?? (lmp ? computeEddFromLmp(lmp) : null);

    return db.transaction(async (tx) => {
      const existingActive =
        await this.maternalHealthRepository.findActivePregnancyByPatientId(
          tx,
          visit.patientId,
        );
      if (existingActive) {
        return { error: "ACTIVE_PREGNANCY_EXISTS" as const };
      }

      const encounter = await this.maternalHealthRepository.createEncounter(
        tx,
        {
          visitId: visit.id,
          patientId: visit.patientId,
          encounterType: "PREGNANCY",
          reason: "PREGNANCY",
          service: visit.service ?? null,
          doctorId: this.context.userId,
        },
      );

      const record = await this.maternalHealthRepository.createPregnancy(tx, {
        patientId: visit.patientId,
        firstVisit: input.firstVisit ?? todayIso(),
        gravida: String(input.gravida),
        para: input.para != null ? String(input.para) : null,
        lastMenstruationPeriod: lmp,
        expectedDeliveryDate: edd,
        assignedFchvId: input.assignedFchvId ?? null,
        visitId: visit.id,
        encounterId: encounter!.id,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
        hmisEthnicCode: input.hmisEthnicCode ?? null,
        gravidaNum: input.gravidaNum ?? null,
        paraNum: input.paraNum ?? null,
        abortionsNum: input.abortionsNum ?? null,
        livingChildrenNum: input.livingChildrenNum ?? null,
      });

      return { encounter, record };
    });
  }

  public async getPregnancyById(id: string) {
    return this.maternalHealthRepository.findPregnancyById(id);
  }

  public async listPregnancies(params: {
    patientId?: string;
    page: number;
    pageSize: number;
  }) {
    const [items, total] = await Promise.all([
      this.maternalHealthRepository.listPregnancies(params),
      this.maternalHealthRepository.countPregnancies({
        patientId: params.patientId,
      }),
    ]);

    return { items, total, page: params.page, pageSize: params.pageSize };
  }

  public async createAntenatalCare(
    input: { pregnancyId: string } & AntenatalCareCreateInput,
  ) {
    const visitResult = await this.requireActiveVisit(input.visitId);
    if ("error" in visitResult) return visitResult;

    const { visit } = visitResult;

    const pregnancy = await this.maternalHealthRepository.findPregnancyById(
      input.pregnancyId,
    );
    if (!pregnancy) return { error: "PREGNANCY_NOT_FOUND" as const };
    if (pregnancy.patientId !== visit.patientId) {
      return { error: "PREGNANCY_PATIENT_MISMATCH" as const };
    }

    // Derive gestational age + canonical protocol visit number from LMP.
    const visitDate = input.ancVisitDate ?? todayIso();
    let gestationalAgeWeeks: number | null = null;
    let canonicalProtocol:
      | "ANC1"
      | "ANC2"
      | "ANC3"
      | "ANC4"
      | "ANC5"
      | "ANC6"
      | "ANC7"
      | "ANC8"
      | null = null;
    let protocolWindowViolation = false;
    if (pregnancy.lastMenstruationPeriod) {
      gestationalAgeWeeks = weeksBetween(
        pregnancy.lastMenstruationPeriod,
        visitDate,
      );
      canonicalProtocol = deriveAncProtocolFromWeeks(gestationalAgeWeeks);
      if (
        input.protocolVisitNumber &&
        input.protocolVisitNumber !== canonicalProtocol
      ) {
        protocolWindowViolation = true;
      }
    } else if (input.protocolVisitNumber) {
      // No LMP — trust the clinician's stated visit number but flag it.
      canonicalProtocol = input.protocolVisitNumber;
      protocolWindowViolation = true;
    }

    const result = await db.transaction(async (tx) => {
      const encounter = await this.maternalHealthRepository.createEncounter(
        tx,
        {
          visitId: visit.id,
          patientId: visit.patientId,
          encounterType: "ANTENATAL_CARE",
          reason: "ANTENATAL_CARE",
          service: visit.service ?? null,
          doctorId: this.context.userId,
        },
      );

      const record = await this.maternalHealthRepository.createAntenatalCare(
        tx,
        {
          ...input,
          patientId: visit.patientId,
          serviceProvidedBy: input.serviceProvidedBy ?? this.context.userId,
          visitId: visit.id,
          encounterId: encounter!.id,
          createdBy: this.context.userId,
          updatedBy: this.context.userId,
          protocolVisitNumber: canonicalProtocol,
          protocolWindowViolation,
          gestationalAgeWeeks,
        },
      );

      return { encounter, record };
    });

    await this.refreshCompliance(input.pregnancyId);
    return result;
  }

  public async listAntenatalCares(params: {
    patientId?: string;
    pregnancyId?: string;
    page: number;
    pageSize: number;
  }) {
    const [items, total] = await Promise.all([
      this.maternalHealthRepository.listAntenatalCares(params),
      this.maternalHealthRepository.countAntenatalCares({
        patientId: params.patientId,
        pregnancyId: params.pregnancyId,
      }),
    ]);

    return { items, total, page: params.page, pageSize: params.pageSize };
  }

  public async createDelivery(
    input: { pregnancyId: string } & DeliveryCreateInput,
  ) {
    const visitResult = await this.requireActiveVisit(input.visitId);
    if ("error" in visitResult) return visitResult;

    const { visit } = visitResult;

    const pregnancy = await this.maternalHealthRepository.findPregnancyById(
      input.pregnancyId,
    );
    if (!pregnancy) return { error: "PREGNANCY_NOT_FOUND" as const };
    if (pregnancy.patientId !== visit.patientId) {
      return { error: "PREGNANCY_PATIENT_MISMATCH" as const };
    }

    const result = await db.transaction(async (tx) => {
      const encounter = await this.maternalHealthRepository.createEncounter(
        tx,
        {
          visitId: visit.id,
          patientId: visit.patientId,
          encounterType: "DELIVERY",
          reason: "DELIVERY",
          service: visit.service ?? null,
          doctorId: this.context.userId,
        },
      );

      const { children, ...deliveryFields } = input;

      const record = await this.maternalHealthRepository.createDelivery(tx, {
        ...deliveryFields,
        admissionAt: deliveryFields.admissionAt
          ? new Date(deliveryFields.admissionAt)
          : null,
        deliveryAt: deliveryFields.deliveryAt
          ? new Date(deliveryFields.deliveryAt)
          : null,
        dischargeAt: deliveryFields.dischargeAt
          ? new Date(deliveryFields.dischargeAt)
          : null,
        patientId: visit.patientId,
        visitId: visit.id,
        encounterId: encounter!.id,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      });

      if (record && children && children.length > 0) {
        await this.maternalHealthRepository.createDeliveryChildren(
          tx,
          record.id,
          input.pregnancyId,
          visit.patientId,
          children,
        );
      }

      await this.maternalHealthRepository.endPregnancy(tx, input.pregnancyId);

      return { encounter, record };
    });

    await this.refreshCompliance(input.pregnancyId);
    return result;
  }

  public async listDeliveries(params: {
    patientId?: string;
    pregnancyId?: string;
    page: number;
    pageSize: number;
  }) {
    const [items, total] = await Promise.all([
      this.maternalHealthRepository.listDeliveries(params),
      this.maternalHealthRepository.countDeliveries({
        patientId: params.patientId,
        pregnancyId: params.pregnancyId,
      }),
    ]);

    return { items, total, page: params.page, pageSize: params.pageSize };
  }

  public async createPostnatalCare(
    input: { pregnancyId: string } & PostnatalCareCreateInput,
  ) {
    const visitResult = await this.requireActiveVisit(input.visitId);
    if ("error" in visitResult) return visitResult;

    const { visit } = visitResult;

    const pregnancy = await this.maternalHealthRepository.findPregnancyById(
      input.pregnancyId,
    );
    if (!pregnancy) return { error: "PREGNANCY_NOT_FOUND" as const };
    if (pregnancy.patientId !== visit.patientId) {
      return { error: "PREGNANCY_PATIENT_MISMATCH" as const };
    }

    return db.transaction(async (tx) => {
      const encounter = await this.maternalHealthRepository.createEncounter(
        tx,
        {
          visitId: visit.id,
          patientId: visit.patientId,
          encounterType: "POSTNATAL_CARE",
          reason: "POSTNATAL_CARE",
          service: visit.service ?? null,
          doctorId: this.context.userId,
        },
      );

      const record = await this.maternalHealthRepository.createPostnatalCare(
        tx,
        {
          ...input,
          patientId: visit.patientId,
          serviceProvidedBy: input.serviceProvidedBy ?? this.context.userId,
          visitId: visit.id,
          encounterId: encounter!.id,
          createdBy: this.context.userId,
          updatedBy: this.context.userId,
        },
      );

      return { encounter, record };
    });
  }

  public async listPostnatalCares(params: {
    patientId?: string;
    pregnancyId?: string;
    page: number;
    pageSize: number;
  }) {
    const [items, total] = await Promise.all([
      this.maternalHealthRepository.listPostnatalCares(params),
      this.maternalHealthRepository.countPostnatalCares({
        patientId: params.patientId,
        pregnancyId: params.pregnancyId,
      }),
    ]);

    return { items, total, page: params.page, pageSize: params.pageSize };
  }

  // ---- HMIS 2082 — Complications, history, screenings, deaths, abortion ----

  public async createComplication(
    pregnancyId: string,
    input: PregnancyComplicationCreateInput,
  ) {
    const pregnancy =
      await this.maternalHealthRepository.findPregnancyById(pregnancyId);
    if (!pregnancy) return { error: "PREGNANCY_NOT_FOUND" as const };

    const record = await this.maternalHealthRepository.createComplication({
      pregnancyId,
      ...input,
    });
    return { record };
  }

  public async createPreviousPregnancies(
    pregnancyId: string,
    items: PreviousPregnancyItemInput[],
  ) {
    const pregnancy =
      await this.maternalHealthRepository.findPregnancyById(pregnancyId);
    if (!pregnancy) return { error: "PREGNANCY_NOT_FOUND" as const };

    const rows = await this.maternalHealthRepository.createPreviousPregnancies(
      pregnancyId,
      items,
    );
    return { items: rows };
  }

  public async patchScreening(
    pregnancyId: string,
    input: ScreeningPatchInput,
  ) {
    const pregnancy =
      await this.maternalHealthRepository.findPregnancyById(pregnancyId);
    if (!pregnancy) return { error: "PREGNANCY_NOT_FOUND" as const };

    const record = await this.maternalHealthRepository.updatePregnancyScreening(
      pregnancyId,
      input as Record<string, unknown>,
    );
    await this.refreshCompliance(pregnancyId);
    return { record };
  }

  public async patchTdDoses(pregnancyId: string, input: TdDosesPatchInput) {
    const pregnancy =
      await this.maternalHealthRepository.findPregnancyById(pregnancyId);
    if (!pregnancy) return { error: "PREGNANCY_NOT_FOUND" as const };

    const record = await this.maternalHealthRepository.updatePregnancyScreening(
      pregnancyId,
      input as Record<string, unknown>,
    );
    return { record };
  }

  public async patchAamaIncentive(
    pregnancyId: string,
    input: AamaIncentivePatchInput,
  ) {
    const pregnancy =
      await this.maternalHealthRepository.findPregnancyById(pregnancyId);
    if (!pregnancy) return { error: "PREGNANCY_NOT_FOUND" as const };

    const record = await this.maternalHealthRepository.updatePregnancyScreening(
      pregnancyId,
      input as Record<string, unknown>,
    );
    return { record };
  }

  public async createMaternalDeath(input: MaternalDeathCreateInput) {
    const record =
      await this.maternalHealthRepository.createMaternalDeath(input);
    return { record };
  }

  public async createNewbornDeath(input: NewbornDeathCreateInput) {
    const record =
      await this.maternalHealthRepository.createNewbornDeath(input);
    return { record };
  }

  public async createSafeAbortion(input: SafeAbortionCreateInput) {
    const record =
      await this.maternalHealthRepository.createSafeAbortion(input);
    return { record };
  }

  public async createSafeAbortionComplication(
    safeAbortionId: string,
    input: SafeAbortionComplicationCreateInput,
  ) {
    const record =
      await this.maternalHealthRepository.createSafeAbortionComplication(
        safeAbortionId,
        input,
      );
    return { record };
  }

  public async createPostAbortionCare(input: PostAbortionCareCreateInput) {
    const record =
      await this.maternalHealthRepository.createPostAbortionCare(input);
    return { record };
  }

  public async upsertPopulationTarget(
    input: FacilityPopulationTargetUpsertInput,
  ) {
    const record =
      await this.maternalHealthRepository.upsertPopulationTarget(input);
    return { record };
  }

  public async listPopulationTargets() {
    return this.maternalHealthRepository.listPopulationTargets();
  }

  /**
   * Sets `hmis_compliant=true` when the pregnancy meets schema-completeness:
   * LMP present, at least one ANC with a canonical protocol_visit_number,
   * and either still active or has a finalised delivery row.
   */
  private async refreshCompliance(pregnancyId: string) {
    const pregnancy =
      await this.maternalHealthRepository.findPregnancyById(pregnancyId);
    if (!pregnancy) return;

    const hasLmp = !!pregnancy.lastMenstruationPeriod;
    const hasAnc = await this.maternalHealthRepository.countAntenatalCares({
      pregnancyId,
    });
    const deliveries = pregnancy.deliveries ?? [];
    const stillActive = pregnancy.status === "active";
    const deliveryComplete = deliveries.some(
      (d: any) =>
        d.deliveryMode &&
        d.laborType &&
        d.placeCode &&
        d.maternalOutcome,
    );

    const compliant =
      hasLmp && hasAnc > 0 && (stillActive || deliveryComplete);

    if (compliant !== pregnancy.hmisCompliant) {
      await this.maternalHealthRepository.setPregnancyComplianceFlag(
        pregnancyId,
        compliant,
      );
    }
  }
}
