import { FacilityContext } from "../../context/facility-context";
import { RoleRepository } from "./roles.repository";
import {
  RoleCreateInput,
  RolesListQuery,
  RoleUpdateInput,
} from "./roles.validation";

export class RoleService {
  private roleRepository: RoleRepository;

  constructor(private readonly context: FacilityContext) {
    this.roleRepository = new RoleRepository();
  }

  public async listRoles(query: RolesListQuery) {
    const [total, items] = await Promise.all([
      this.roleRepository.countFiltered(query.searchString),
      this.roleRepository.findFiltered({
        searchString: query.searchString,
        limit: query.pageSize,
        offset: (query.page - 1) * query.pageSize,
      }),
    ]);

    return { items, total };
  }

  public async getRoleById(id: string) {
    return this.roleRepository.findById(id);
  }

  public async createRole(input: RoleCreateInput) {
    const existing = await this.roleRepository.findByName(input.name);
    if (existing) return { error: "ROLE_NAME_EXISTS" as const };
    const role = await this.roleRepository.create(input);
    return { role };
  }

  public async updateRole(id: string, input: RoleUpdateInput) {
    if (input.name) {
      const existing = await this.roleRepository.findByName(input.name);
      if (existing && existing.id !== id)
        return { error: "ROLE_NAME_EXISTS" as const };
    }
    const updated = await this.roleRepository.updateById(id, input);
    return updated;
  }

  public async deleteRole(id: string) {
    return this.roleRepository.softDeleteById(id, this.context.userId);
  }
}
