/**
 * Demo seeder for the `lab_orders` worklist that powers the Laboratory
 * Console. Picks the first facility that has patients, attaches a spread of
 * pathology + radiology orders across the pending / collected / completed
 * lifecycle and routine / urgent priorities, referencing real patients and a
 * clinical user from that facility.
 *
 * Idempotent: if the target facility already has lab orders it skips entirely
 * (so re-running never duplicates the demo set). It never touches real data.
 */

import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "../../index";
import { lab_orders, patients, users } from "../../schema";

interface SeedSummary {
  inserted: number;
  skipped: boolean;
  facilityId: string | null;
}

export async function seedLabOrders(): Promise<SeedSummary> {
  // 1) Find a facility that actually has patients to attach orders to.
  const [facilityRow] = await db
    .select({ facilityId: patients.facilityId })
    .from(patients)
    .where(isNull(patients.deletedAt))
    .groupBy(patients.facilityId)
    .orderBy(sql`count(*) desc`)
    .limit(1);

  const facilityId = facilityRow?.facilityId ?? null;
  if (!facilityId) {
    console.warn("[seed-lab-orders] no patients found — nothing to seed");
    return { inserted: 0, skipped: true, facilityId: null };
  }

  // 2) Idempotency: bail if this facility already has lab orders.
  // Existing order names for this facility. We top up only the orders that are
  // missing (matched by name) so re-running the seed adds newly-introduced
  // sample orders without duplicating the ones already present.
  const existingRows = await db
    .select({ name: lab_orders.name })
    .from(lab_orders)
    .where(eq(lab_orders.facilityId, facilityId));
  const existingNames = new Set(existingRows.map((r) => r.name));

  // 3) Gather up to 6 patients + one clinical user from that facility.
  const patientRows = await db
    .select({ id: patients.id })
    .from(patients)
    .where(and(eq(patients.facilityId, facilityId), isNull(patients.deletedAt)))
    .limit(6);
  const patientIds = patientRows.map((p) => p.id);
  if (patientIds.length === 0) {
    return { inserted: 0, skipped: true, facilityId };
  }

  const [userRow] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.facilityId, facilityId), isNull(users.deletedAt)))
    .limit(1);
  const orderedById = userRow?.id ?? null;

  const pick = (i: number) => patientIds[i % patientIds.length];
  const now = Date.now();
  const minutesAgo = (m: number) => new Date(now - m * 60_000);

  const values: Array<typeof lab_orders.$inferInsert> = [
    {
      type: "pathology",
      name: "Complete Blood Count",
      panel: "CBC",
      patientId: pick(0),
      facilityId,
      orderedById,
      orderedAt: minutesAgo(35),
      reason: "Fever, fatigue — rule out anemia/infection",
      priority: "routine",
      status: "pending",
    },
    {
      type: "pathology",
      name: "Renal Function Test",
      panel: "RFT",
      patientId: pick(1),
      facilityId,
      orderedById,
      orderedAt: minutesAgo(90),
      reason: "Reduced urine output",
      priority: "urgent",
      status: "collected",
      specimen: "Serum",
      collectedAt: minutesAgo(60),
      collectedByName: "Lab Technician",
    },
    {
      type: "pathology",
      name: "Lipid Profile",
      panel: "LIPID",
      patientId: pick(2),
      facilityId,
      orderedById,
      orderedAt: minutesAgo(240),
      reason: "Routine cardiovascular screening",
      priority: "routine",
      status: "completed",
      specimen: "Serum (fasting)",
      collectedAt: minutesAgo(210),
      collectedByName: "Lab Technician",
      resultMode: "form",
      result: {
        rows: [
          {
            analyte: "Total Cholesterol",
            value: "212",
            unit: "mg/dL",
            range: "< 200",
            flag: "high",
          },
          {
            analyte: "HDL Cholesterol",
            value: "38",
            unit: "mg/dL",
            range: "> 40",
            flag: "low",
          },
          {
            analyte: "LDL Cholesterol",
            value: "140",
            unit: "mg/dL",
            range: "< 130",
            flag: "high",
          },
          {
            analyte: "Triglycerides",
            value: "160",
            unit: "mg/dL",
            range: "< 150",
            flag: "high",
          },
        ],
        note: "Advise dietary modification and recheck in 3 months.",
      },
      completedByName: "Dr. Pathologist",
      completedAt: minutesAgo(180),
    },
    {
      type: "radiology",
      name: "Chest X-Ray (PA View)",
      modality: "X-Ray",
      patientId: pick(3),
      facilityId,
      orderedById,
      orderedAt: minutesAgo(50),
      reason: "Persistent cough, suspected chest infection",
      priority: "routine",
      status: "pending",
    },
    {
      type: "radiology",
      name: "Ultrasound — Whole Abdomen",
      modality: "USG",
      patientId: pick(4),
      facilityId,
      orderedById,
      orderedAt: minutesAgo(120),
      reason: "Right upper quadrant pain",
      priority: "urgent",
      status: "pending",
    },
    {
      type: "radiology",
      name: "Ultrasound — Obstetric",
      modality: "USG",
      patientId: pick(5),
      facilityId,
      orderedById,
      orderedAt: minutesAgo(300),
      reason: "Dating scan",
      priority: "routine",
      status: "completed",
      resultMode: "form",
      result: {
        technique: "Transabdominal grayscale ultrasound.",
        findings:
          "Single live intrauterine gestation. Fetal cardiac activity present. " +
          "Liquor adequate. Placenta fundal, grade I.",
        impression: "Single live intrauterine pregnancy ~12 weeks. No abnormality detected.",
      },
      completedByName: "Dr. Radiologist",
      completedAt: minutesAgo(240),
    },
    {
      type: "pathology",
      name: "Urine Routine & Microscopy",
      panel: "URINE",
      patientId: pick(0),
      facilityId,
      orderedById,
      orderedAt: minutesAgo(25),
      reason: "Burning micturition — ?UTI",
      priority: "routine",
      status: "collected",
      specimen: "Mid-stream urine",
      collectedAt: minutesAgo(15),
      collectedByName: "Lab Technician",
    },
    {
      type: "pathology",
      name: "Dengue NS1 / serology",
      panel: "NS1",
      patientId: pick(1),
      facilityId,
      orderedById,
      orderedAt: minutesAgo(20),
      reason: "High fever × 4 days, low platelets",
      priority: "urgent",
      status: "collected",
      specimen: "Serum",
      collectedAt: minutesAgo(10),
      collectedByName: "Lab Technician",
    },
    {
      type: "pathology",
      name: "Blood Group & Rh typing",
      panel: "BLOODGRP",
      patientId: pick(2),
      facilityId,
      orderedById,
      orderedAt: minutesAgo(18),
      reason: "Antenatal booking workup",
      priority: "routine",
      status: "pending",
    },
  ];

  const toInsert = values.filter((v) => !existingNames.has(v.name));
  if (toInsert.length === 0) {
    console.log(
      `[seed-lab-orders] facility ${facilityId} already has all sample orders — skipping`,
    );
    return { inserted: 0, skipped: true, facilityId };
  }

  const inserted = await db
    .insert(lab_orders)
    .values(toInsert)
    .returning({ id: lab_orders.id });

  return { inserted: inserted.length, skipped: false, facilityId };
}
