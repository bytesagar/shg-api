import { generatePatientId } from "../../utils/id-generator";
import { PatientCreateInput } from "../../validations/patient.validation";
import { FacilityContext } from "../../context/facility-context";
import { PatientRepository } from "./patient.repository";
import { patients } from "../../db/schema";
import {
  andFilter,
  orFilter,
  toSqlWhere,
  type SqlFilter,
} from "../../utils/sql-filter";

export class PatientService {
  private patientRepository: PatientRepository;

  constructor(private readonly context: FacilityContext) {
    this.patientRepository = new PatientRepository(context);
  }

  public async createPatient(data: PatientCreateInput) {
    const patientId = await generatePatientId();
    return this.patientRepository.createWithInitialVisit(data, patientId);
  }

  public async getPatientById(id: string) {
    return this.patientRepository.findById(id);
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
