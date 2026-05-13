import { and, asc, desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import {
  imnci_chart_booklets,
  imnci_classification_rules,
  imnci_counselling_messages,
  imnci_formulary,
  imnci_questions,
  imnci_treatment_rules,
} from "@/db/schema";
import { FacilityContext } from "@/context/facility-context";

export class ImnciChartBookletRepository {
  constructor(private readonly context: FacilityContext) {}

  /**
   * Resolve the active booklet for the caller's facility.
   *
   * Resolution order:
   *   1. Booklet pinned to this facility.
   *   2. Global booklet (facilityId IS NULL AND municipalityId IS NULL).
   *
   * Picks the most recently effective booklet at each tier.
   */
  public async findActiveForFacility() {
    const rows = await db
      .select()
      .from(imnci_chart_booklets)
      .where(
        and(
          eq(imnci_chart_booklets.status, "active"),
          or(
            eq(imnci_chart_booklets.facilityId, this.context.facilityId),
            and(
              isNull(imnci_chart_booklets.facilityId),
              isNull(imnci_chart_booklets.municipalityId),
            ),
          ),
        ),
      )
      .orderBy(desc(imnci_chart_booklets.effectiveFrom));

    if (rows.length === 0) return null;

    const facilityPinned = rows.find(
      (r) => r.facilityId === this.context.facilityId,
    );
    return facilityPinned ?? rows[0];
  }

  public async findBookletById(id: string) {
    const result = await db
      .select()
      .from(imnci_chart_booklets)
      .where(eq(imnci_chart_booklets.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  public async findQuestionsByBooklet(bookletId: string) {
    return db
      .select()
      .from(imnci_questions)
      .where(eq(imnci_questions.bookletId, bookletId))
      .orderBy(
        asc(imnci_questions.section),
        asc(imnci_questions.displayOrder),
      );
  }

  public async findClassificationRulesByBooklet(bookletId: string) {
    return db
      .select()
      .from(imnci_classification_rules)
      .where(eq(imnci_classification_rules.bookletId, bookletId))
      .orderBy(
        asc(imnci_classification_rules.section),
        asc(imnci_classification_rules.priority),
      );
  }

  public async findTreatmentRulesByBooklet(bookletId: string) {
    return db
      .select()
      .from(imnci_treatment_rules)
      .where(eq(imnci_treatment_rules.bookletId, bookletId))
      .orderBy(
        asc(imnci_treatment_rules.classificationCode),
        asc(imnci_treatment_rules.sequence),
      );
  }

  public async findFormularyByBooklet(bookletId: string) {
    return db
      .select()
      .from(imnci_formulary)
      .where(eq(imnci_formulary.bookletId, bookletId))
      .orderBy(asc(imnci_formulary.drugCode));
  }

  public async findCounsellingByBooklet(bookletId: string) {
    return db
      .select()
      .from(imnci_counselling_messages)
      .where(eq(imnci_counselling_messages.bookletId, bookletId))
      .orderBy(
        asc(imnci_counselling_messages.key),
        asc(imnci_counselling_messages.language),
      );
  }
}
