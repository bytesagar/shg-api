import { db } from "../../db";
import { FacilityContext } from "../../context/facility-context";
import { VisitRepository } from "../clinical-visits/visit.repository";
import { MaternalHealthRepository } from "./maternal-health.repository";
import {
  AntenatalCareCreateInput,
  DeliveryCreateInput,
  PostnatalCareCreateInput,
  PregnancyCreateInput,
} from "./maternal-health.validation";

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
        firstVisit: input.firstVisit ?? new Date().toISOString().slice(0, 10),
        gravida: String(input.gravida),
        para: input.para != null ? String(input.para) : null,
        lastMenstruationPeriod: input.lastMenstruationPeriod ?? null,
        expectedDeliveryDate: input.expectedDeliveryDate ?? null,
        assignedFchvId: input.assignedFchvId ?? null,
        visitId: visit.id,
        encounterId: encounter!.id,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
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

    return db.transaction(async (tx) => {
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
        },
      );

      return { encounter, record };
    });
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

    return db.transaction(async (tx) => {
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

      const record = await this.maternalHealthRepository.createDelivery(tx, {
        ...input,
        patientId: visit.patientId,
        visitId: visit.id,
        encounterId: encounter!.id,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      });

      await this.maternalHealthRepository.endPregnancy(tx, input.pregnancyId);

      return { encounter, record };
    });
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
}
