import { Icd11CodeRepository } from "../repositories/icd11-code.repository";
import type { Icd11CodesListQuery } from "../validations/icd11.validation";

export class Icd11CodeService {
  constructor(private readonly repository = new Icd11CodeRepository()) {}

  async list(params: Icd11CodesListQuery) {
    return this.repository.list(params);
  }
}
