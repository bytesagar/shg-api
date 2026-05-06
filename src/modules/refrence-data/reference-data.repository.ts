import { db } from "../../db";
import { districts, municipalities, provinces } from "../../db/schema";
import { and, asc, eq, isNull, SQL } from "drizzle-orm";

export class ReferenceDataRepository {
  public async listProvinces() {
    const items = await db
      .select({
        id: provinces.id,
        code: provinces.code,
        name: provinces.name,
      })
      .from(provinces)
      .where(isNull(provinces.deletedAt))
      .orderBy(asc(provinces.code));

    return { items };
  }

  public async listDistricts(params: { provinceId?: string }) {
    const where: SQL[] = [isNull(districts.deletedAt)];
    if (params.provinceId != null) {
      where.push(eq(provinces.id, params.provinceId));
    }

    const items = await db
      .select({
        id: districts.id,
        code: districts.code,
        name: districts.name,
        provinceId: districts.provinceId,
        provinceCode: provinces.code,
      })
      .from(districts)
      .innerJoin(provinces, eq(provinces.id, districts.provinceId))
      .where(and(...where))
      .orderBy(asc(districts.code));

    return { items };
  }

  public async listMunicipalities(params: { districtId?: string }) {
    const where: SQL[] = [isNull(municipalities.deletedAt)];
    if (params.districtId != null) {
      where.push(eq(districts.id, params.districtId));
    }

    const items = await db
      .select({
        id: municipalities.id,
        code: municipalities.code,
        name: municipalities.name,
        noOfWards: municipalities.noOfWards,
        districtId: municipalities.districtId,
        districtCode: districts.code,
      })
      .from(municipalities)
      .innerJoin(districts, eq(districts.id, municipalities.districtId))
      .where(and(...where))
      .orderBy(asc(municipalities.code));

    return { items };
  }
}
