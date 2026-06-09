import { SQL, and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  health_facilities,
  lab_orders,
  patients,
  person_names,
  persons,
  users,
} from "@/db/schema";
import { FacilityRepository } from "@/core/facility-repository";
import { FacilityContext } from "@/context/facility-context";

import type {
  CollectSampleInput,
  CreateLabOrderInput,
  LabOrdersListQuery,
  RecordResultInput,
  UploadResultInput,
} from "./lab-order.validation";

/**
 * The projected worklist row. Patient name / MRN / demographics and the
 * ordering clinician are resolved via joins so the console renders without
 * follow-up lookups. Age/initials are left to the client (date-helper).
 */
const worklistColumns = {
  id: lab_orders.id,
  type: lab_orders.type,
  name: lab_orders.name,
  panel: lab_orders.panel,
  modality: lab_orders.modality,
  reason: lab_orders.reason,
  priority: lab_orders.priority,
  status: lab_orders.status,
  orderedAt: lab_orders.orderedAt,
  visitId: lab_orders.visitId,
  encounterId: lab_orders.encounterId,
  specimen: lab_orders.specimen,
  collectedAt: lab_orders.collectedAt,
  collectedByName: lab_orders.collectedByName,
  resultMode: lab_orders.resultMode,
  result: lab_orders.result,
  attachmentId: lab_orders.attachmentId,
  completedByName: lab_orders.completedByName,
  completedAt: lab_orders.completedAt,
  createdAt: lab_orders.createdAt,
  patientId: lab_orders.patientId,
  patientMrn: patients.patientId,
  patientGiven: person_names.given,
  patientMiddle: person_names.middle,
  patientFamily: person_names.family,
  patientGender: persons.gender,
  patientBirthDate: persons.birthDate,
  facilityId: lab_orders.facilityId,
  facilityName: health_facilities.name,
  orderedById: lab_orders.orderedById,
  orderedByFirstName: users.firstName,
  orderedByLastName: users.lastName,
  orderedByDesignation: users.designation,
} as const;

export class LabOrderRepository extends FacilityRepository {
  constructor(context: FacilityContext) {
    super(context, lab_orders.facilityId);
  }

  private baseSelect() {
    return db
      .select(worklistColumns)
      .from(lab_orders)
      .leftJoin(patients, eq(patients.id, lab_orders.patientId))
      .leftJoin(persons, eq(persons.id, patients.personId))
      .leftJoin(
        person_names,
        and(
          eq(person_names.personId, patients.personId),
          eq(person_names.isPrimary, true),
        ),
      )
      .leftJoin(
        health_facilities,
        eq(health_facilities.id, lab_orders.facilityId),
      )
      .leftJoin(users, eq(users.id, lab_orders.orderedById));
  }

  public async list(filters: LabOrdersListQuery) {
    const where = this.composeWhere(filters);
    const offset = (filters.page - 1) * filters.pageSize;

    const [rows, [{ count } = { count: 0 }]] = await Promise.all([
      this.baseSelect()
        .where(where)
        .orderBy(desc(lab_orders.orderedAt))
        .limit(filters.pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(lab_orders)
        .where(where),
    ]);

    return {
      items: rows.map((r) => this.toShape(r)),
      total: count,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  }

  public async findById(id: string) {
    const [row] = await this.baseSelect()
      .where(this.withFacilityScope(and(eq(lab_orders.id, id), isNull(lab_orders.deletedAt))))
      .limit(1);
    return row ? this.toShape(row) : null;
  }

  /** Worklist counts by status (excludes cancelled/soft-deleted from totals). */
  public async stats() {
    const rows = await db
      .select({
        status: lab_orders.status,
        count: sql<number>`count(*)::int`,
      })
      .from(lab_orders)
      .where(this.withFacilityScope(isNull(lab_orders.deletedAt)))
      .groupBy(lab_orders.status);

    const byStatus = Object.fromEntries(
      rows.map((r) => [r.status, r.count]),
    ) as Record<string, number>;

    return {
      pending: byStatus.pending ?? 0,
      collected: byStatus.collected ?? 0,
      completed: byStatus.completed ?? 0,
      cancelled: byStatus.cancelled ?? 0,
    };
  }

  public async create(input: CreateLabOrderInput) {
    const [row] = await db
      .insert(lab_orders)
      .values({
        type: input.type,
        name: input.name,
        labTestId: input.labTestId ?? null,
        panel: input.panel ?? null,
        modality: input.modality ?? null,
        patientId: input.patientId,
        visitId: input.visitId ?? null,
        encounterId: input.encounterId ?? null,
        orderedById: input.orderedById ?? this.context.userId,
        reason: input.reason ?? null,
        priority: input.priority,
        facilityId: this.context.facilityId,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning({ id: lab_orders.id });
    return row ? this.findById(row.id) : null;
  }

  public async collect(id: string, input: CollectSampleInput) {
    const updated = await db
      .update(lab_orders)
      .set({
        specimen: input.specimen,
        collectedByName: input.collectedByName ?? null,
        collectedAt: new Date(),
        status: "collected",
        updatedBy: this.context.userId,
        updatedAt: new Date(),
      })
      .where(
        this.withFacilityScope(
          and(eq(lab_orders.id, id), isNull(lab_orders.deletedAt)),
        ),
      )
      .returning({ id: lab_orders.id });
    return updated[0] ? this.findById(id) : null;
  }

  public async recordResult(id: string, input: RecordResultInput) {
    const updated = await db
      .update(lab_orders)
      .set({
        result: input.result,
        resultMode: "form",
        completedByName: input.completedByName ?? null,
        completedAt: new Date(),
        status: "completed",
        updatedBy: this.context.userId,
        updatedAt: new Date(),
      })
      .where(
        this.withFacilityScope(
          and(eq(lab_orders.id, id), isNull(lab_orders.deletedAt)),
        ),
      )
      .returning({ id: lab_orders.id });
    return updated[0] ? this.findById(id) : null;
  }

  public async uploadResult(id: string, input: UploadResultInput) {
    const updated = await db
      .update(lab_orders)
      .set({
        attachmentId: input.attachmentId,
        result: input.fileName ? { fileName: input.fileName } : null,
        resultMode: "upload",
        completedByName: input.completedByName ?? null,
        completedAt: new Date(),
        status: "completed",
        updatedBy: this.context.userId,
        updatedAt: new Date(),
      })
      .where(
        this.withFacilityScope(
          and(eq(lab_orders.id, id), isNull(lab_orders.deletedAt)),
        ),
      )
      .returning({ id: lab_orders.id });
    return updated[0] ? this.findById(id) : null;
  }

  private composeWhere(filters: LabOrdersListQuery): SQL {
    const conds: Array<SQL> = [isNull(lab_orders.deletedAt)];
    if (filters.type) conds.push(eq(lab_orders.type, filters.type));
    if (filters.status) conds.push(eq(lab_orders.status, filters.status));
    if (filters.priority) conds.push(eq(lab_orders.priority, filters.priority));
    if (filters.patientId) conds.push(eq(lab_orders.patientId, filters.patientId));
    if (filters.q) {
      const term = `%${filters.q}%`;
      conds.push(
        or(
          ilike(lab_orders.name, term),
          ilike(patients.patientId, term),
          ilike(person_names.given, term),
          ilike(person_names.family, term),
        ) as SQL,
      );
    }
    return this.withFacilityScope(and(...conds) as SQL) as SQL;
  }

  private toShape(r: Record<string, unknown>) {
    const given = (r.patientGiven as string | null) ?? null;
    const middle = (r.patientMiddle as string | null) ?? null;
    const family = (r.patientFamily as string | null) ?? null;
    const patientName = [given, middle, family].filter(Boolean).join(" ");
    const orderedByName =
      [r.orderedByFirstName, r.orderedByLastName].filter(Boolean).join(" ") ||
      null;

    return {
      id: r.id,
      type: r.type,
      name: r.name,
      panel: r.panel,
      modality: r.modality,
      reason: r.reason,
      priority: r.priority,
      status: r.status,
      orderedAt: r.orderedAt,
      visitId: r.visitId,
      encounterId: r.encounterId,
      patient: {
        id: r.patientId,
        name: patientName,
        mrn: r.patientMrn ?? null,
        gender: r.patientGender ?? null,
        birthDate: r.patientBirthDate ?? null,
      },
      facility: {
        id: r.facilityId,
        name: r.facilityName ?? null,
      },
      orderedBy: r.orderedById
        ? {
            id: r.orderedById,
            name: orderedByName,
            designation: r.orderedByDesignation ?? null,
          }
        : null,
      collected: r.collectedAt
        ? {
            specimen: r.specimen ?? null,
            collectedAt: r.collectedAt,
            collectedByName: r.collectedByName ?? null,
          }
        : null,
      result: r.result ?? null,
      resultMode: r.resultMode ?? null,
      attachmentId: r.attachmentId ?? null,
      completedByName: r.completedByName ?? null,
      completedAt: r.completedAt ?? null,
      createdAt: r.createdAt,
    };
  }
}
