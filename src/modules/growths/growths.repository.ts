import { db } from "../../db";
import { child_immunizations, growths } from "../../db/schema";
import { FacilityContext } from "../../context/facility-context";
import { FacilityRepository } from "../../core/facility-repository";
import { and, asc, count, eq, isNull } from "drizzle-orm";

export class GrowthRepository extends FacilityRepository {
  constructor(context: FacilityContext) {
    super(context, growths.facilityId);
  }

  public async findChildImmunizationIdForPatient(patientId: string) {
    const [row] = await db
      .select({ id: child_immunizations.id })
      .from(child_immunizations)
      .where(
        and(
          eq(child_immunizations.patientId, patientId),
          eq(child_immunizations.facilityId, this.context.facilityId),
          isNull(child_immunizations.deletedAt),
        ),
      )
      .limit(1);
    return row?.id ?? null;
  }

  public async findById(id: string) {
    const [row] = await db
      .select()
      .from(growths)
      .where(this.withFacilityScope(and(eq(growths.id, id), isNull(growths.deletedAt))))
      .limit(1);
    return row ?? null;
  }

  public async create(params: {
    patientId: string;
    date: Date;
    weight: number | null;
    height: number | null;
    muac: number | null;
    childImmunizationId: string | null;
  }) {
    const [row] = await db
      .insert(growths)
      .values({
        patientId: params.patientId,
        facilityId: this.context.facilityId,
        date: params.date,
        weight: params.weight,
        height: params.height,
        muac: params.muac,
        childImmunizationId: params.childImmunizationId,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    return row ?? null;
  }

  public async update(
    id: string,
    patch: {
      date?: Date;
      weight?: number | null;
      height?: number | null;
      muac?: number | null;
    },
  ) {
    const [row] = await db
      .update(growths)
      .set({
        ...patch,
        updatedBy: this.context.userId,
        updatedAt: new Date(),
      })
      .where(this.withFacilityScope(and(eq(growths.id, id), isNull(growths.deletedAt))))
      .returning();
    return row ?? null;
  }

  public async listByPatient(params: {
    patientId: string;
    page: number;
    pageSize: number;
  }) {
    const offset = (params.page - 1) * params.pageSize;
    const where = this.withFacilityScope(
      and(eq(growths.patientId, params.patientId), isNull(growths.deletedAt)),
    );

    const [items, totalRow] = await Promise.all([
      db
        .select({
          id: growths.id,
          date: growths.date,
          weight: growths.weight,
          height: growths.height,
          muac: growths.muac,
          patientId: growths.patientId,
          childImmunizationId: growths.childImmunizationId,
          createdAt: growths.createdAt,
          updatedAt: growths.updatedAt,
        })
        .from(growths)
        .where(where)
        .orderBy(asc(growths.date))
        .limit(params.pageSize)
        .offset(offset),
      db.select({ value: count() }).from(growths).where(where),
    ]);

    return { items, total: totalRow[0]?.value ?? 0 };
  }
}
