import { db } from "../../db";
import {
  complaints,
  confirm_diagnoses,
  encounters,
  histories,
  medications,
  physical_examinations,
  provisional_diagnoses,
  tests,
  treatments,
  vitals,
} from "../../db/schema";
import { FacilityContext } from "../../context/facility-context";
import { VisitRepository } from "./visit.repository";
import {
  ComplaintCreateInput,
  ConfirmDiagnosisCreateInput,
  HistoryCreateInput,
  MedicationCreateInput,
  PhysicalExaminationCreateInput,
  ProvisionalDiagnosisCreateInput,
  TestCreateInput,
  TreatmentCreateInput,
  VitalsCreateInput,
} from "./visit.validation";

export class VisitRecordService {
  private visitRepository: VisitRepository;

  constructor(private readonly context: FacilityContext) {
    this.visitRepository = new VisitRepository(context);
  }

  private async getOwnedVisit(visitId: string) {
    const visit = await this.visitRepository.findById(visitId);
    if (!visit || visit.facilityId !== this.context.facilityId) return null;
    return visit;
  }

  private async createEncounter(tx: any, visit: any, encounterType: string) {
    const inserted = await tx
      .insert(encounters)
      .values({
        visitId: visit.id,
        patientId: visit.patientId,
        facilityId: this.context.facilityId,
        encounterAt: new Date(),
        reason: encounterType,
        service: visit.service ?? null,
        status: "finished",
        encounterType,
        doctorId: this.context.userId,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    return inserted[0];
  }

  public async addVitals(visitId: string, input: VitalsCreateInput) {
    const visit = await this.getOwnedVisit(visitId);
    if (!visit) return null;

    return db.transaction(async (tx) => {
      const encounter = await this.createEncounter(tx, visit, "VITALS");
      const inserted = await tx
        .insert(vitals)
        .values({
          ...input,
          visitId: visit.id,
          encounterId: encounter.id,
          createdBy: this.context.userId,
          updatedBy: this.context.userId,
        })
        .returning();
      return { encounter, record: inserted[0] };
    });
  }

  public async addHistory(visitId: string, input: HistoryCreateInput) {
    const visit = await this.getOwnedVisit(visitId);
    if (!visit) return null;

    return db.transaction(async (tx) => {
      const encounter = await this.createEncounter(tx, visit, "HISTORY");
      const inserted = await tx
        .insert(histories)
        .values({
          ...input,
          visitId: visit.id,
          encounterId: encounter.id,
          createdBy: this.context.userId,
          updatedBy: this.context.userId,
        })
        .returning();
      return { encounter, record: inserted[0] };
    });
  }

  public async addComplaint(visitId: string, input: ComplaintCreateInput) {
    const visit = await this.getOwnedVisit(visitId);
    if (!visit) return null;

    return db.transaction(async (tx) => {
      const encounter = await this.createEncounter(tx, visit, "COMPLAINT");
      const inserted = await tx
        .insert(complaints)
        .values({
          ...input,
          patientId: visit.patientId,
          visitId: visit.id,
          encounterId: encounter.id,
          createdBy: this.context.userId,
          updatedBy: this.context.userId,
        })
        .returning();
      return { encounter, record: inserted[0] };
    });
  }

  public async addPhysicalExamination(
    visitId: string,
    input: PhysicalExaminationCreateInput,
  ) {
    const visit = await this.getOwnedVisit(visitId);
    if (!visit) return null;

    return db.transaction(async (tx) => {
      const encounter = await this.createEncounter(
        tx,
        visit,
        "PHYSICAL_EXAMINATION",
      );
      const inserted = await tx
        .insert(physical_examinations)
        .values({
          ...input,
          patientId: visit.patientId,
          visitId: visit.id,
          encounterId: encounter.id,
          createdBy: this.context.userId,
          updatedBy: this.context.userId,
        })
        .returning();
      return { encounter, record: inserted[0] };
    });
  }

  public async addProvisionalDiagnosis(
    visitId: string,
    input: ProvisionalDiagnosisCreateInput,
  ) {
    const visit = await this.getOwnedVisit(visitId);
    if (!visit) return null;

    return db.transaction(async (tx) => {
      const encounter = await this.createEncounter(
        tx,
        visit,
        "PROVISIONAL_DIAGNOSIS",
      );
      const inserted = await tx
        .insert(provisional_diagnoses)
        .values({
          ...input,
          patientId: visit.patientId,
          visitId: visit.id,
          encounterId: encounter.id,
          createdBy: this.context.userId,
          updatedBy: this.context.userId,
        })
        .returning();
      return { encounter, record: inserted[0] };
    });
  }

  public async addConfirmDiagnosis(
    visitId: string,
    input: ConfirmDiagnosisCreateInput,
  ) {
    const visit = await this.getOwnedVisit(visitId);
    if (!visit) return null;

    return db.transaction(async (tx) => {
      const encounter = await this.createEncounter(
        tx,
        visit,
        "CONFIRM_DIAGNOSIS",
      );
      const inserted = await tx
        .insert(confirm_diagnoses)
        .values({
          ...input,
          patientId: visit.patientId,
          visitId: visit.id,
          encounterId: encounter.id,
          createdBy: this.context.userId,
          updatedBy: this.context.userId,
        })
        .returning();
      return { encounter, record: inserted[0] };
    });
  }

  public async addTest(visitId: string, input: TestCreateInput) {
    const visit = await this.getOwnedVisit(visitId);
    if (!visit) return null;

    return db.transaction(async (tx) => {
      const encounter = await this.createEncounter(tx, visit, "TEST");
      const inserted = await tx
        .insert(tests)
        .values({
          ...input,
          visitId: visit.id,
          encounterId: encounter.id,
          createdBy: this.context.userId,
          updatedBy: this.context.userId,
        })
        .returning();
      return { encounter, record: inserted[0] };
    });
  }

  public async addTreatment(visitId: string, input: TreatmentCreateInput) {
    const visit = await this.getOwnedVisit(visitId);
    if (!visit) return null;

    return db.transaction(async (tx) => {
      const encounter = await this.createEncounter(tx, visit, "TREATMENT");
      const inserted = await tx
        .insert(treatments)
        .values({
          ...input,
          patientId: visit.patientId,
          visitId: visit.id,
          encounterId: encounter.id,
          createdBy: this.context.userId,
          updatedBy: this.context.userId,
        })
        .returning();
      return { encounter, record: inserted[0] };
    });
  }

  public async addMedication(visitId: string, input: MedicationCreateInput) {
    const visit = await this.getOwnedVisit(visitId);
    if (!visit) return null;

    return db.transaction(async (tx) => {
      const encounter = await this.createEncounter(tx, visit, "MEDICATION");
      const inserted = await tx
        .insert(medications)
        .values({
          ...input,
          patientId: visit.patientId,
          visitId: visit.id,
          encounterId: encounter.id,
          createdBy: this.context.userId,
          updatedBy: this.context.userId,
        })
        .returning();
      return { encounter, record: inserted[0] };
    });
  }
}
