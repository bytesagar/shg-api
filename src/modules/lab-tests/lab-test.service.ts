import { AppError } from "@/utils/app-error";
import { HTTP_STATUS } from "@/config/constants";

import { LabTestRepository } from "./lab-test.repository";

import type { LabTestsListQuery } from "./lab-test.validation";

export class LabTestService {
    private readonly repository: LabTestRepository;

    constructor() {
        this.repository = new LabTestRepository();
    }

    public async list(query: LabTestsListQuery) {
        return this.repository.list({
            page: query.page,
            pageSize: query.pageSize,
            q: query.q,
            category: query.category,
        });
    }

    public async getById(id: string) {
        const row = await this.repository.findById(id);
        if (!row) {
            throw new AppError("Lab test not found.", HTTP_STATUS.NOT_FOUND);
        }
        return row;
    }
}
