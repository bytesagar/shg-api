import { format } from "date-fns";

import {
  generatePatientId,
  generateRegistrationNo,
} from "../../utils/id-generator";
import {
  PatientCreateInput,
  PatientFamilyPlanningProfileInput,
  PatientUpdateInput,
} from "../../validations/patient.validation";
import { FacilityContext } from "../../context/facility-context";
import { PatientRepository } from "./patient.repository";
import {
  health_facilities,
  patients,
  person_contacts,
  person_names,
} from "../../db/schema";
import {
  andFilter,
  orFilter,
  toSqlWhere,
  type SqlFilter,
} from "../../utils/sql-filter";
import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";
import { NotificationService } from "../notifications/notification.service";
import { SmsService } from "../sms/sms.service";
import { db } from "../../db";
import { eq, sql } from "drizzle-orm";
import { logger } from "../../utils/logger";

export class PatientService {
  private patientRepository: PatientRepository;
  private notifications: NotificationService;
  private sms: SmsService;

  constructor(private readonly context: FacilityContext) {
    this.patientRepository = new PatientRepository(context);
    this.notifications = new NotificationService(context.userId);
    this.sms = new SmsService(context);
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

    const patientId = await generatePatientId(data.address?.districtId ?? undefined);

    // Keep a provided registration number, else generate a unique one for the
    // facility. Keep a provided registration date, else default to today.
    const registrationNo =
      data.registrationNo?.trim() ||
      (await generateRegistrationNo(this.context.facilityId));
    const registrationDate =
      data.registrationDate?.trim() || format(new Date(), "yyyy-MM-dd");

    let newPatient;
    try {
      newPatient = await this.patientRepository.createWithInitialVisit(
        data,
        patientId,
        { registrationNo, registrationDate },
      );
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

    // Patient-facing welcome SMS (best-effort; never blocks registration).
    // This is the single registration entry point for all services (OPD,
    // pregnancy, IMNCI all create a patient here first), so the welcome text
    // is sent once here rather than at each downstream record-create hook.
    const patientName = [data.firstName, data.middleName, data.lastName]
      .filter(Boolean)
      .join(" ");
    await this.sms.sendTemplate(
      "patientRegistration",
      data.phoneNumber,
      { name: patientName, patientId: newPatient.patientId },
      { patientId: newPatient.id },
    );

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

  public async updatePatient(id: string, data: PatientUpdateInput) {
    try {
      return await this.patientRepository.updatePatient(id, data);
    } catch (err: any) {
      if (err?.code === "23505") {
        throw new AppError(
          "Another patient already exists with the same details",
          HTTP_STATUS.CONFLICT,
        );
      }
      throw err;
    }
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
      // Match the human MRN (patientId) as well as the patient's name and
      // primary phone. Name/phone live on the normalized `person_*` tables, so
      // they're matched with correlated EXISTS subqueries keyed on the (already
      // facility-scoped) patient's `person_id`.
      const term = `%${searchString}%`;
      clauses.push(
        orFilter(
          { ilike: { column: patients.patientId, value: searchString } },
          {
            raw: sql`EXISTS (SELECT 1 FROM ${person_names} WHERE ${person_names.personId} = ${patients.personId} AND (${person_names.given} ILIKE ${term} OR ${person_names.middle} ILIKE ${term} OR ${person_names.family} ILIKE ${term}))`,
          },
          {
            raw: sql`EXISTS (SELECT 1 FROM ${person_contacts} WHERE ${person_contacts.personId} = ${patients.personId} AND ${person_contacts.value} ILIKE ${term})`,
          },
        ),
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
