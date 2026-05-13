import { and, asc, desc, eq, gte, lte, SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  imnci_fchv_commodities_dispensed,
  imnci_fchv_screenings,
} from "@/db/schema";
import { FacilityContext } from "@/context/facility-context";
import { FacilityRepository } from "@/core/facility-repository";

export interface CreateScreeningInput {
  patientId?: string;
  visitedAt?: Date;
  location?: unknown;
  dangerSignsFound: string[];
  referralRecommended: boolean;
  referralUrgency?: "urgent" | "routine";
  notes?: string;
}

export interface DispenseInput {
  commodity: string;
  quantity: number;
  unit: string;
  batchNo?: string;
  dispensedAt?: Date;
}

export class ImnciFchvRepository extends FacilityRepository {
  constructor(context: FacilityContext) {
    super(context, imnci_fchv_screenings.facilityId);
  }

  public async createScreening(input: CreateScreeningInput, fchvUserId: string) {
    const [row] = await db
      .insert(imnci_fchv_screenings)
      .values({
        facilityId: this.context.facilityId,
        patientId: input.patientId ?? null,
        fchvUserId,
        visitedAt: input.visitedAt ?? new Date(),
        location: input.location ?? null,
        dangerSignsFound: input.dangerSignsFound,
        referralRecommended: input.referralRecommended,
        referralUrgency: input.referralUrgency ?? null,
        notes: input.notes ?? null,
      })
      .returning();
    return row;
  }

  public async findScreeningById(id: string) {
    const rows = await db
      .select()
      .from(imnci_fchv_screenings)
      .where(this.withFacilityScope(eq(imnci_fchv_screenings.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  public async listScreenings(params: {
    fchvUserId: string;
    page: number;
    pageSize: number;
    from?: string;
    to?: string;
    referralRecommended?: boolean;
  }) {
    const filters: SQL[] = [eq(imnci_fchv_screenings.fchvUserId, params.fchvUserId)];
    if (params.from) filters.push(gte(imnci_fchv_screenings.visitedAt, new Date(params.from)));
    if (params.to) filters.push(lte(imnci_fchv_screenings.visitedAt, new Date(params.to)));
    if (params.referralRecommended !== undefined) {
      filters.push(
        eq(imnci_fchv_screenings.referralRecommended, params.referralRecommended),
      );
    }

    const offset = (params.page - 1) * params.pageSize;
    const items = await db
      .select()
      .from(imnci_fchv_screenings)
      .where(this.withFacilityScope(and(...filters)))
      .orderBy(desc(imnci_fchv_screenings.visitedAt))
      .limit(params.pageSize)
      .offset(offset);

    return { items, page: params.page, pageSize: params.pageSize };
  }

  public async dispense(screeningId: string, input: DispenseInput) {
    const [row] = await db
      .insert(imnci_fchv_commodities_dispensed)
      .values({
        screeningId,
        commodity: input.commodity,
        quantity: input.quantity,
        unit: input.unit,
        batchNo: input.batchNo ?? null,
        dispensedAt: input.dispensedAt ?? new Date(),
      })
      .returning();
    return row;
  }

  public async listDispensedForScreening(screeningId: string) {
    return db
      .select()
      .from(imnci_fchv_commodities_dispensed)
      .where(eq(imnci_fchv_commodities_dispensed.screeningId, screeningId))
      .orderBy(asc(imnci_fchv_commodities_dispensed.dispensedAt));
  }
}
