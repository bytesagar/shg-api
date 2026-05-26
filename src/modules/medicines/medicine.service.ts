import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";
import { MedicineRepository } from "./medicine.repository";
import type {
  MedicineCreateInput,
  MedicineUpdateInput,
  MedicinesListQuery,
} from "../../validations/medicine.validation";

export class MedicineService {
  constructor(private readonly repository = new MedicineRepository()) {}

  async list(params: MedicinesListQuery) {
    return this.repository.list(params);
  }

  async getById(id: string) {
    const medicine = await this.repository.findById(id);
    if (!medicine) {
      throw new AppError("Medicine not found", HTTP_STATUS.NOT_FOUND);
    }
    return medicine;
  }

  async create(data: MedicineCreateInput, userId: string) {
    return this.repository.create(data, userId);
  }

  async update(id: string, data: MedicineUpdateInput, userId: string) {
    const updated = await this.repository.update(id, data, userId);
    if (!updated) {
      throw new AppError("Medicine not found", HTTP_STATUS.NOT_FOUND);
    }
    return updated;
  }

  async delete(id: string, userId: string) {
    const deleted = await this.repository.softDelete(id, userId);
    if (!deleted) {
      throw new AppError("Medicine not found", HTTP_STATUS.NOT_FOUND);
    }
  }
}
