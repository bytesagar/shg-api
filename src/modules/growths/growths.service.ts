import { FacilityContext } from "../../context/facility-context";
import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";
import { PatientRepository } from "../patients/patient.repository";
import { GrowthRepository } from "./growths.repository";
import type {
  GrowthCreateInput,
  GrowthUpdateInput,
} from "./growths.validation";

export class GrowthService {
  private readonly repo: GrowthRepository;
  private readonly patientRepository: PatientRepository;

  constructor(private readonly context: FacilityContext) {
    this.repo = new GrowthRepository(context);
    this.patientRepository = new PatientRepository(context);
  }

  public async createForPatient(patientId: string, input: GrowthCreateInput) {
    const patient = await this.patientRepository.findById(patientId);
    if (!patient) {
      throw new AppError("Patient not found", HTTP_STATUS.NOT_FOUND);
    }

    const childImmunizationId =
      await this.repo.findChildImmunizationIdForPatient(patientId);

    const created = await this.repo.create({
      patientId,
      date: new Date(`${input.date}T00:00:00.000Z`),
      weight: input.weight ?? null,
      height: input.height ?? null,
      muac: input.muac ?? null,
      childImmunizationId,
    });

    if (!created) {
      throw new AppError(
        "Unable to create growth record",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
      );
    }
    return created;
  }

  public async update(id: string, input: GrowthUpdateInput) {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new AppError("Growth record not found", HTTP_STATUS.NOT_FOUND);
    }

    const patch: {
      date?: Date;
      weight?: number | null;
      height?: number | null;
      muac?: number | null;
    } = {};
    if (input.date !== undefined) {
      patch.date = new Date(`${input.date}T00:00:00.000Z`);
    }
    if (input.weight !== undefined) patch.weight = input.weight;
    if (input.height !== undefined) patch.height = input.height;
    if (input.muac !== undefined) patch.muac = input.muac;

    const updated = await this.repo.update(id, patch);
    if (!updated) {
      throw new AppError("Growth record not found", HTTP_STATUS.NOT_FOUND);
    }
    return updated;
  }

  public async listByPatient(params: {
    patientId: string;
    page: number;
    pageSize: number;
  }) {
    const patient = await this.patientRepository.findById(params.patientId);
    if (!patient) {
      throw new AppError("Patient not found", HTTP_STATUS.NOT_FOUND);
    }
    const { items, total } = await this.repo.listByPatient(params);
    return { items, total, page: params.page, pageSize: params.pageSize };
  }
}
