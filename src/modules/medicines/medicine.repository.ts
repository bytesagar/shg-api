import { db } from "../../db";
import { medicines } from "../../db/schema";
import { and, asc, count, eq, ilike, isNull, SQL } from "drizzle-orm";
import type {
  MedicineCreateInput,
  MedicineUpdateInput,
  MedicinesListQuery,
} from "../../validations/medicine.validation";

/**
 * `medicineForm` and `strength` participate in the composite unique key and
 * are NOT NULL in the schema. The API contract still lets clients send
 * null/undefined to "leave blank" — coerce those to "" before the DB write so
 * blanks are deduplicated consistently. The other optional fields stay
 * nullable.
 */
function toRow(data: Partial<MedicineCreateInput>) {
  const row: {
    medicineName?: string;
    medicineForm?: string;
    strength?: string;
    unit?: string | null;
    dose?: string | null;
    frequency?: string | null;
    route?: string | null;
    medicineTime?: string | null;
    isDefault?: boolean;
  } = {};
  if (data.medicineName !== undefined) row.medicineName = data.medicineName;
  if ("medicineForm" in data) row.medicineForm = data.medicineForm ?? "";
  if ("strength" in data) row.strength = data.strength ?? "";
  if ("unit" in data) row.unit = data.unit ?? null;
  if ("dose" in data) row.dose = data.dose ?? null;
  if ("frequency" in data) row.frequency = data.frequency ?? null;
  if ("route" in data) row.route = data.route ?? null;
  if ("medicineTime" in data) row.medicineTime = data.medicineTime ?? null;
  if (data.isDefault !== undefined) row.isDefault = data.isDefault;
  return row;
}

/**
 * Data access for the global medicine registry. Not facility-scoped — this is a
 * shared reference catalog (like `icd11_codes`), so it does not extend
 * FacilityRepository. Soft-deleted rows (deletedAt set) are excluded from reads.
 */
export class MedicineRepository {
  async list(params: MedicinesListQuery) {
    const parts: SQL[] = [isNull(medicines.deletedAt)];

    if (params.form) {
      parts.push(eq(medicines.medicineForm, params.form));
    }

    if (typeof params.isDefault === "boolean") {
      parts.push(eq(medicines.isDefault, params.isDefault));
    }

    if (params.q) {
      parts.push(ilike(medicines.medicineName, `%${params.q}%`));
    }

    const whereClause = parts.length === 1 ? parts[0] : and(...parts);

    const totalResult = await db
      .select({ c: count() })
      .from(medicines)
      .where(whereClause);

    const items = await db
      .select()
      .from(medicines)
      .where(whereClause)
      .orderBy(asc(medicines.medicineName))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize);

    return {
      items,
      total: Number(totalResult[0]?.c ?? 0),
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  async findById(id: string) {
    const [row] = await db
      .select()
      .from(medicines)
      .where(and(eq(medicines.id, id), isNull(medicines.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  async create(data: MedicineCreateInput, userId: string) {
    const row = toRow(data);
    if (!row.medicineName) {
      throw new Error("medicineName is required");
    }
    const [created] = await db
      .insert(medicines)
      .values({ ...row, medicineName: row.medicineName, createdBy: userId })
      .returning();
    return created;
  }

  async update(id: string, data: MedicineUpdateInput, userId: string) {
    const [row] = await db
      .update(medicines)
      .set({ ...toRow(data), updatedBy: userId, updatedAt: new Date() })
      .where(and(eq(medicines.id, id), isNull(medicines.deletedAt)))
      .returning();
    return row ?? null;
  }

  async softDelete(id: string, userId: string) {
    const [row] = await db
      .update(medicines)
      .set({ deletedAt: new Date(), deletedBy: userId })
      .where(and(eq(medicines.id, id), isNull(medicines.deletedAt)))
      .returning({ id: medicines.id });
    return row ?? null;
  }
}
