import { generatePatientId } from "../utils/id-generator";
import { PatientCreateInput } from "../validations/patient.validation";
import { FacilityContext } from "../context/facility-context";
import { PatientRepository } from "../repositories/patient.repository";
import { patients } from "../db/schema";
import {
  andFilter,
  orFilter,
  toSqlWhere,
  type SqlFilter,
} from "../utils/sql-filter";

export class PatientService {
  private patientRepository: PatientRepository;

  constructor(private readonly context: FacilityContext) {
    this.patientRepository = new PatientRepository(context);
  }

  public async createPatient(data: PatientCreateInput) {
    const patientId = await generatePatientId();
    return this.patientRepository.createWithInitialEncounter(data, patientId);
  }

  public async getPatientById(id: string) {
    return this.patientRepository.findById(id);
  }

  public async getAllPatients(filters?: {
    searchString?: string;
    service?: string;
  }) {
    const clauses: Array<SqlFilter | undefined> = [];

    const searchString = filters?.searchString?.trim();
    if (searchString) {
      clauses.push(
        orFilter(
          { ilike: { column: patients.patientId, value: searchString } },
          { ilike: { column: patients.phoneNumber, value: searchString } },
          { ilike: { column: patients.firstName, value: searchString } },
          { ilike: { column: patients.lastName, value: searchString } },
          { ilike: { column: patients.name, value: searchString } },
        ),
      );
    }

    const service = filters?.service?.trim();
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
    return this.patientRepository.findAll(where);
  }
}
