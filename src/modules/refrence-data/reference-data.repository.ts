import { db } from "../../db";
import { districts, municipalities, provinces } from "../../db/schema";
import { and, asc, eq, isNull, SQL } from "drizzle-orm";

export class ReferenceDataRepository {
  public async listProvinces() {
    return db
      .select({
        id: provinces.id,
        code: provinces.code,
        name: provinces.name,
      })
      .from(provinces)
      .where(isNull(provinces.deletedAt))
      .orderBy(asc(provinces.code));
  }

  public async listDistricts(params: { provinceCode?: number }) {
    const where: SQL[] = [isNull(districts.deletedAt)];
    if (params.provinceCode != null) {
      where.push(eq(provinces.code, params.provinceCode));
    }

    return db
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
  }

  public async listMunicipalities(params: { districtCode?: number }) {
    const where: SQL[] = [isNull(municipalities.deletedAt)];
    if (params.districtCode != null) {
      where.push(eq(districts.code, params.districtCode));
    }

    return db
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
  }
}
