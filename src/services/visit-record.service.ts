import { db } from "../db";
import {
  complaints,
  confirm_diagnoses,
  documents,
  histories,
  medications,
  physical_examinations,
  provisional_diagnoses,
  tests,
  treatments,
  vitals,
} from "../db/schema";
import { FacilityContext } from "../context/facility-context";
import { VisitRepository } from "../repositories/visit.repository";
import {
  ComplaintCreateInput,
  ConfirmDiagnosisCreateInput,
  DocumentCreateInput,
  HistoryCreateInput,
  MedicationCreateInput,
  PhysicalExaminationCreateInput,
  ProvisionalDiagnosisCreateInput,
  TestCreateInput,
  TreatmentCreateInput,
  VitalsCreateInput,
} from "../validations/visit.validation";

export class VisitRecordService {
  private visitRepository: VisitRepository;

  constructor(private readonly context: FacilityContext) {
    this.visitRepository = new VisitRepository(context);
  }

  private async getOwnedVisit(visitId: string) {
    return this.visitRepository.findById(visitId);
  }

  public async addVitals(visitId: string, input: VitalsCreateInput) {
    const visit = await this.getOwnedVisit(visitId);
    if (!visit) return null;

    const inserted = await db
      .insert(vitals)
      .values({
        ...input,
        visitId: visit.id,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    return inserted[0];
  }

  public async addHistory(visitId: string, input: HistoryCreateInput) {
    const visit = await this.getOwnedVisit(visitId);
    if (!visit) return null;

    const inserted = await db
      .insert(histories)
      .values({
        ...input,
        visitId: visit.id,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    return inserted[0];
  }

  public async addComplaint(visitId: string, input: ComplaintCreateInput) {
    const visit = await this.getOwnedVisit(visitId);
    if (!visit) return null;

    const inserted = await db
      .insert(complaints)
      .values({
        ...input,
        patientId: visit.patientId,
        visitId: visit.id,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    return inserted[0];
  }

  public async addPhysicalExamination(
    visitId: string,
    input: PhysicalExaminationCreateInput,
  ) {
    const visit = await this.getOwnedVisit(visitId);
    if (!visit) return null;

    const inserted = await db
      .insert(physical_examinations)
      .values({
        ...input,
        patientId: visit.patientId,
        visitId: visit.id,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    return inserted[0];
  }

  public async addProvisionalDiagnosis(
    visitId: string,
    input: ProvisionalDiagnosisCreateInput,
  ) {
    const visit = await this.getOwnedVisit(visitId);
    if (!visit) return null;

    const inserted = await db
      .insert(provisional_diagnoses)
      .values({
        ...input,
        patientId: visit.patientId,
        visitId: visit.id,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    return inserted[0];
  }

  public async addConfirmDiagnosis(
    visitId: string,
    input: ConfirmDiagnosisCreateInput,
  ) {
    const visit = await this.getOwnedVisit(visitId);
    if (!visit) return null;

    const inserted = await db
      .insert(confirm_diagnoses)
      .values({
        ...input,
        patientId: visit.patientId,
        visitId: visit.id,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    return inserted[0];
  }

  public async addTest(visitId: string, input: TestCreateInput) {
    const visit = await this.getOwnedVisit(visitId);
    if (!visit) return null;

    const inserted = await db
      .insert(tests)
      .values({
        ...input,
        visitId: visit.id,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    return inserted[0];
  }

  public async addTreatment(visitId: string, input: TreatmentCreateInput) {
    const visit = await this.getOwnedVisit(visitId);
    if (!visit) return null;

    const inserted = await db
      .insert(treatments)
      .values({
        ...input,
        patientId: visit.patientId,
        visitId: visit.id,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    return inserted[0];
  }

  public async addMedication(
    visitId: string,
    input: MedicationCreateInput,
  ) {
    const visit = await this.getOwnedVisit(visitId);
    if (!visit) return null;

    const inserted = await db
      .insert(medications)
      .values({
        ...input,
        patientId: visit.patientId,
        visitId: visit.id,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    return inserted[0];
  }

  public async addDocument(visitId: string, input: DocumentCreateInput) {
    const visit = await this.getOwnedVisit(visitId);
    if (!visit) return null;

    const inserted = await db
      .insert(documents)
      .values({
        ...input,
        patientId: visit.patientId,
        visitId: visit.id,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    return inserted[0];
  }
}
