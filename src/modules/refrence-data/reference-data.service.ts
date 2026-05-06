import { ReferenceDataRepository } from "./reference-data.repository";
import type {
  DistrictsQuery,
  MunicipalitiesQuery,
} from "./reference-data.validation";

export class ReferenceDataService {
  constructor(private readonly repo = new ReferenceDataRepository()) {}

  public async listProvinces() {
    return this.repo.listProvinces();
  }

  public async listDistricts(query: DistrictsQuery) {
    return this.repo.listDistricts({ provinceId: query.provinceId });
  }

  public async listMunicipalities(query: MunicipalitiesQuery) {
    return this.repo.listMunicipalities({ districtId: query.districtId });
  }
}
