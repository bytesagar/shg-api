import { SQL, and, eq } from "drizzle-orm";
import { FacilityContext } from "../context/facility-context";

export abstract class FacilityRepository {
  protected constructor(
    protected readonly context: FacilityContext,
    private readonly facilityColumn: any,
  ) {}

  protected withFacilityScope(where?: SQL) {
    const facilityFilter = eq(this.facilityColumn, this.context.facilityId);
    return where ? and(facilityFilter, where) : facilityFilter;
  }
}
