import { generatePatientId } from "../../utils/id-generator";
import {
  PatientCreateInput,
  PatientFamilyPlanningProfileInput,
} from "../../validations/patient.validation";
import { FacilityContext } from "../../context/facility-context";
import { PatientRepository } from "./patient.repository";
import { patients } from "../../db/schema";
import {
  andFilter,
  orFilter,
  toSqlWhere,
  type SqlFilter,
} from "../../utils/sql-filter";
import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";

export class PatientService {
  private patientRepository: PatientRepository;

  constructor(private readonly context: FacilityContext) {
    this.patientRepository = new PatientRepository(context);
  }

  public async createPatient(data: PatientCreateInput) {
    const birthDate = data.birthDate ? data.birthDate.toISOString().slice(0, 10) : null;
    const duplicate = await this.patientRepository.findDuplicateCandidate({
      firstName: data.firstName,
      lastName: data.lastName,
      birthDate,
      phoneNumber: data.phoneNumber ?? null,
      identifiers: data.identifiers?.map((i) => ({ system: i.system, value: i.value })) ?? null,
    });

    if (duplicate) {
      throw new AppError(
        "Patient already exists with the same details",
        HTTP_STATUS.CONFLICT,
      );
    }

    const patientId = await generatePatientId();
    try {
      return await this.patientRepository.createWithInitialVisit(data, patientId);
    } catch (err: any) {
      if (err?.code === "23505") {
        throw new AppError(
          "Patient already exists with the same details",
          HTTP_STATUS.CONFLICT,
        );
      }
      throw err;
    }
  }

  public async getPatientById(id: string) {
    return this.patientRepository.findDetailById(id);
  }

  public async updateFamilyPlanningProfile(
    id: string,
    data: PatientFamilyPlanningProfileInput,
  ) {
    return this.patientRepository.updateFamilyPlanningProfile(id, data);
  }

  public async getAllPatients(params: {
    page: number;
    pageSize: number;
    searchString?: string;
    service?: string;
  }) {
    const clauses: Array<SqlFilter | undefined> = [];

    const searchString = params.searchString?.trim();
    if (searchString) {
      clauses.push(
        orFilter({ ilike: { column: patients.patientId, value: searchString } }),
      );
    }

    const service = params.service?.trim();
    if (service) {
      clauses.push({
        ilike: {
          column: patients.service,
          value: service,
          mode: "exact" as const,
        },
      });
    }

    const where = toSqlWhere(andFilter(...clauses));
    const total = await this.patientRepository.countAll(where);
    const items = await this.patientRepository.findAll(where, {
      limit: params.pageSize,
      offset: (params.page - 1) * params.pageSize,
    });

    return {
      items,
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }
}
