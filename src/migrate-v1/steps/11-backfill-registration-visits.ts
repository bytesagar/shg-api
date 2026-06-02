import { sql } from "drizzle-orm";

import { db } from "../../db";
import { encounters, visits } from "../../db/schema";
import { type MigrationContext, type MigrationStep } from "../context";

/**
 * Backfill a single "registration" visit (+ encounter) for every patient that
 * ended up with NO visit history.
 *
 * Why this is needed: v2 models every attendance as a `visits` row (with a 1:1
 * `encounters` row), but in v1 only the `Encounter` table mapped to that
 * concept. Maternal (step 07) and immunization (step 08) records were linked
 * straight to the patient (`patient_id`) and never produced a visit, so a
 * patient whose only v1 activity was ANC or immunization doses has full
 * clinical data but an empty Visits tab. Family-planning (step 09) already
 * synthesises its own visits; a handful of FP/OPD patients with no activity at
 * all are swept up here too.
 *
 * This creates ONE visit per affected patient (a registration-style entry),
 * dated at the patient's earliest recorded clinical activity (falling back to
 * the registration date, then created_at). It does NOT attach the existing
 * clinical records to the new visit — those continue to surface in their own
 * service tabs (which read by patient_id), this just gives the Visits tab a
 * starting point.
 *
 * Idempotent: it only targets patients that currently have zero visits, so a
 * re-run finds none left and inserts nothing. No id-map entry is needed.
 */

const REASON = "Registration (migrated)";
const STATUS = "finished" as const;

type NoVisitPatient = {
  patient_id: string;
  facility_id: string | null;
  service: string | null;
  visit_date: string; // 'YYYY-MM-DD'
  created_at: string; // ISO timestamp string from the raw pg driver
};

export const backfillRegistrationVisitsStep: MigrationStep = {
  key: "backfill-visits",
  title: "Backfill registration visits for patients with no visit",
  async run(ctx: MigrationContext): Promise<void> {
    const { report } = ctx;

    // For every patient with no visit, pick the earliest meaningful date we can
    // find. min() over the per-patient clinical dates, then the registration
    // date, then created_at — guaranteed non-null because created_at is NOT NULL.
    const result = await db.execute<NoVisitPatient>(sql`
      SELECT
        p.id AS patient_id,
        p.facility_id,
        p.service,
        COALESCE(
          (SELECT min(ih.date)::date FROM immunization_histories ih WHERE ih.patient_id = p.id),
          (SELECT min(ac.anc_visit_date) FROM antenatal_cares ac WHERE ac.patient_id = p.id),
          (SELECT min(fp.service_date) FROM family_plannings fp WHERE fp.patient_id = p.id),
          (SELECT min(g.date)::date FROM growths g WHERE g.patient_id = p.id),
          p.registration_date,
          p.created_at::date
        ) AS visit_date,
        p.created_at
      FROM patients p
      WHERE NOT EXISTS (SELECT 1 FROM visits v WHERE v.patient_id = p.id)
    `);

    const rows = result.rows;
    report.setV1Count("backfill_visit", rows.length);

    if (ctx.dryRun) {
      report.inserted("backfill_visit", rows.length);
      report.inserted("backfill_encounter", rows.length);
      return;
    }

    // Batch the inserts; one transaction per batch keeps each chunk atomic.
    for (let i = 0; i < rows.length; i += ctx.batchSize) {
      const batch = rows.slice(i, i + ctx.batchSize);
      await db.transaction(async (tx) => {
        for (const r of batch) {
          const service = r.service?.trim() || null;
          // The raw pg driver hands back created_at as a string; Drizzle's
          // timestamp columns expect a Date, so coerce here.
          const createdAt = r.created_at ? new Date(r.created_at) : new Date();
          const [visit] = await tx
            .insert(visits)
            .values({
              date: r.visit_date,
              reason: REASON,
              service,
              status: STATUS,
              patientId: r.patient_id,
              facilityId: r.facility_id,
              createdAt,
            })
            .returning({ id: visits.id });

          await tx.insert(encounters).values({
            encounterAt: createdAt,
            reason: REASON,
            service,
            status: STATUS,
            encounterType: service ?? "opd",
            patientId: r.patient_id,
            visitId: visit.id,
            facilityId: r.facility_id,
            createdAt,
          });

          report.inserted("backfill_visit");
          report.inserted("backfill_encounter");
        }
      });
    }
  },
};
