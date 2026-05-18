import { generatePatientId } from "../../utils/id-generator";
import {
  PatientCreateInput,
  PatientFamilyPlanningProfileInput,
} from "../../validations/patient.validation";
import { FacilityContext } from "../../context/facility-context";
import { PatientRepository } from "./patient.repository";
import { health_facilities, patients } from "../../db/schema";
import {
  andFilter,
  orFilter,
  toSqlWhere,
  type SqlFilter,
} from "../../utils/sql-filter";
import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";
import { NotificationService } from "../notifications/notification.service";
import { db } from "../../db";
import { eq } from "drizzle-orm";
import { logger } from "../../utils/logger";

export class PatientService {
  private patientRepository: PatientRepository;
  private notifications: NotificationService;

  constructor(private readonly context: FacilityContext) {
    this.patientRepository = new PatientRepository(context);
    this.notifications = new NotificationService(context.userId);
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
    let newPatient;
    try {
      newPatient = await this.patientRepository.createWithInitialVisit(data, patientId);
    } catch (err: any) {
      if (err?.code === "23505") {
        throw new AppError(
          "Patient already exists with the same details",
          HTTP_STATUS.CONFLICT,
        );
      }
      throw err;
    }

    await this.publishPatientRegistered(newPatient, data);
    return newPatient;
  }

  private async publishPatientRegistered(
    newPatient: typeof patients.$inferSelect,
    data: PatientCreateInput,
  ) {
    try {
      const patientName = [data.firstName, data.middleName, data.lastName]
        .filter(Boolean)
        .join(" ");

      const [facility] = await db
        .select({ name: health_facilities.name })
        .from(health_facilities)
        .where(eq(health_facilities.id, this.context.facilityId))
        .limit(1);

      await this.notifications.publish({
        kind: "system.patient.registered",
        recipientUserIds: [],
        data: {
          patientName,
          facilityName: facility?.name ?? this.context.facilityId,
          facilityId: this.context.facilityId,
          service: newPatient.service,
          patientId: newPatient.id,
          moduleId: newPatient.id,
          occurredAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      logger.error("patients.activity_push_failed", { err });
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
