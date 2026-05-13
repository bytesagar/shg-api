# CB-IMNCI Backend Feature Plan

**Status:** Draft v1
**Target program:** Nepal **CB-IMNCI** (Community-Based Integrated Management of Neonatal and Childhood Illness, MoHP, 2014 onward)
**Scope:** Backend only (Node.js / TypeScript / Express / Drizzle / PostgreSQL)
**Codebase conventions:** Follows `CLAUDE.md` — Routes → Controller → Service → Repository → Drizzle, facility-scoped multi-tenancy, Zod validation, RBAC via `authorize()`.

---

## 1. Background (implementation lens)

CB-IMNCI is a deterministic clinical protocol for managing sick children under 5. The backend needs to capture an assessment, run the classification rules, generate a treatment plan, and track follow-ups — across two distinct clinical pathways and two distinct user cadres.

### Two clinical pathways

| Pathway               | Age                    | Notes                                                                                          |
| --------------------- | ---------------------- | ---------------------------------------------------------------------------------------------- |
| **Sick Young Infant** | 0 up to 2 months       | Different signs (PSBI, jaundice, feeding problem), different forms, different drugs/doses.     |
| **Sick Child**        | 2 months up to 5 years | Cough/difficult breathing, diarrhoea, fever, ear problem, malnutrition, anaemia, immunization. |

### Two user cadres (maps to existing RBAC)

| Cadre                                                    | Existing role group     | What they can do                                                                                                                                     |
| -------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Health workers at Health Post / PHCC / District Hospital | `CLINICAL_WRITE_ROLES`  | Full assess → classify → treat → follow-up.                                                                                                          |
| FCHVs (Female Community Health Volunteers)               | `COMMUNITY_WRITE_ROLES` | Promotive activities, commodity dispensing (ORS, zinc, iron, chlorhexidine), danger-sign screening, **referral**. No classification, no prescribing. |

### Classification mechanics (drives the engine design)

For each main symptom the worker collects answers and the protocol assigns a colour-coded classification:

- 🟥 **Pink (severe)** — refer urgently after pre-referral treatment.
- 🟨 **Yellow (moderate)** — treat at facility, follow up.
- 🟩 **Green (mild)** — home care + counsel + when-to-return.

A single visit produces **multiple** classifications (e.g. PNEUMONIA + SOME DEHYDRATION + MODERATE ANAEMIA). The engine must return all of them.

### Nepal CB-IMNCI specifics that affect data

- Five target conditions: pneumonia, diarrhoea, malnutrition, measles, malaria. (Malaria branch is present but low-incidence — keep it, don't drop it.)
- Diarrhoea dehydration: No / Some / Severe.
- Service levels: District Hospital → PHCC → Health Post → Community (FCHV). All represented in your existing facility model.
- HMIS reporting (monthly) is a hard requirement — aggregates per classification, per facility, per FY month. Plan for reporting events from day one.

---

## 2. Scope for v1 (MVP)

**In scope**

- Sick Child pathway (2 months – 5 years), full Assess → Classify → Treat → Follow-up loop.
- Both cadres: clinical (full flow) and FCHV (screening + referral + commodity log).
- One CB-IMNCI booklet version, seeded as data.
- IMNCI visit = an `encounter` row with `type = 'imnci'` + IMNCI-specific child tables.
- Worklist endpoints (today's visits, today's follow-ups, referred-out cases).

**Deferred to phase 2+**

- Sick Young Infant pathway (0–2 months).
- Offline sync (mobile concern — API shape already supports it via PATCH-accumulating assessment).
- Supervisor/HMIS aggregate reports.
- FHIR projection of IMNCI classifications as `Condition` + `CarePlan` resources.

---

## 3. Architecture decisions (locked)

1. **An IMNCI visit IS an encounter.** A row in `encounters` with `type = 'imnci'` plus a 1:1 `imnci_visits` row carrying the IMNCI-specific state. Reuses existing encounter timeline, FHIR projection, and audit.
2. **A child IS a patient.** No parallel `children` table. The protocol-specific cutoffs (age < 5y, age < 2m) are runtime checks on `patient.dateOfBirth` at visit start.
3. **Rules live in the database, not in code.** Classification rules, drug dosing, counselling messages all live in versioned reference tables. Clinical content updates do not require a deploy.
4. **Facility-scoped, even for reference data.** Booklet/questions/rules tables carry `facilityId` and a `municipalityId` (when shareable across a palika). A facility resolves its "active booklet" at visit start. This keeps `FacilityRepository` semantics intact and lets municipalities pilot versions.
5. **Idempotent classification.** `POST /imnci/visits/:id/classify` is replayable — it replaces prior classifications + plan items in `recommended` state but never touches items the clinician has already confirmed.

---

## 4. Module layout

Following the canonical layout described in `CLAUDE.md`:

```
src/modules/imnci/
  imnci-visit.controller.ts
  imnci-visit.service.ts
  imnci-visit.repository.ts
  imnci-assessment.service.ts
  imnci-classification.service.ts       # pure rules engine — no Drizzle here
  imnci-treatment.service.ts            # dose calc + plan generation
  imnci-followup.service.ts
  imnci-fchv.controller.ts              # FCHV-scoped endpoints
  imnci-fchv.service.ts
  imnci-chart-booklet.service.ts        # active-booklet resolution
  imnci-chart-booklet.repository.ts

src/routes/
  imnci.routes.ts                       # mounted in src/routes/index.ts
  imnci-fchv.routes.ts

src/validations/
  imnci.validation.ts                   # Zod schemas
  imnci-fchv.validation.ts

src/db/
  schema.ts                             # additions only — see §5
  seeds/imnci/                          # CB-IMNCI Nepal booklet seed data
    booklet.ts
    questions.ts
    classification-rules.ts
    treatment-rules.ts
    formulary.ts
    counselling.ts
```

`imnci-classification.service.ts` does **not** import `db` — it receives a context object built by the visit service, making it trivially unit-testable with Jest fixtures.

---

## 5. Schema additions (`src/db/schema.ts`)

All new tables snake_case in the DB, camelCase in TS (per existing `casing: "snake_case"`). All facility-scoped tables carry `facilityId` so their repositories can extend `FacilityRepository`.

### 5.1 Encounter coupling

No new column on `encounters`. We use the existing `type`/`encounter_type` field with a new enum value `'imnci'`. (Confirm exact field name when implementing; the migration may need an enum extension.)

### 5.2 Reference tables (booklet versioned content)

```ts
imnciChartBooklets {
  id, facilityId, municipalityId?, versionCode (e.g. 'NP-CB-IMNCI-2014'),
  country, effectiveFrom, status, createdAt, updatedAt
}

imnciQuestions {
  id, bookletId,
  key (stable, e.g. 'cough.duration_days'),
  pathway: 'young_infant' | 'sick_child',
  section: 'danger_signs' | 'cough' | 'diarrhoea' | 'fever' | 'ear' | 'malnutrition' | 'anaemia' | 'immunization',
  prompt (i18n key), inputType: 'bool' | 'int' | 'enum' | 'text',
  options (jsonb), validation (jsonb), displayOrder
}

imnciClassificationRules {
  id, bookletId, pathway, section,
  classificationCode (e.g. 'SEVERE_PNEUMONIA', 'SOME_DEHYDRATION'),
  severity: 'pink' | 'yellow' | 'green',
  priority,                  -- evaluated top-down; first match wins per section
  predicate (jsonb)          -- shape mirrors src/utils/sql-filter.ts SqlFilter DSL
}

imnciTreatmentRules {
  id, bookletId, classificationCode,
  actionKind: 'drug' | 'referral' | 'counselling' | 'procedure',
  drugRef?, doseTable (jsonb),    -- weight bands × age bands
  durationDays?, followUpDays?, counsellingKey?
}

imnciFormulary {
  id, bookletId, drugCode, name, formulation,
  weightBandedDoses (jsonb), notes
}

imnciCounsellingMessages {
  id, bookletId, key, classificationCode?, language, body
}
```

### 5.3 Per-visit clinical tables

```ts
imnciVisits {
  id, facilityId, patientId, encounterId (FK, unique),
  bookletId,                     -- pinned at visit start
  pathway,                       -- redundant convenience; derived from patient age
  ageMonthsAtVisit, weightKg, tempC, muacMm,
  status: 'in_progress' | 'classified' | 'completed' | 'referred',
  startedAt, classifiedAt, completedAt,
  startedByUserId, completedByUserId
}

imnciAssessmentAnswers {
  id, visitId, questionKey, valueBool?, valueInt?, valueText?,
  answeredAt, answeredByUserId
  -- append-only audit: latest value wins by answeredAt
}

imnciVisitClassifications {
  id, visitId, classificationCode, severity, ruleIdSnapshot,
  source: 'engine' | 'override',
  createdAt
}

imnciTreatmentPlanItems {
  id, visitId, classificationCode, kind, drugCode?,
  doseAmount, doseUnit, frequency, durationDays,
  status: 'recommended' | 'confirmed' | 'overridden' | 'cancelled',
  confirmedByUserId?, confirmedAt?, notes
}

imnciFollowUps {
  id, facilityId, visitId, patientId,
  dueOn, reason, status: 'scheduled' | 'completed' | 'missed',
  completedVisitId?
}

imnciReferrals {
  id, facilityId, visitId, patientId,
  fromFacilityId, toFacilityId?, reason, classifications (jsonb),
  preReferralTreatmentGiven (jsonb), referredAt, referredByUserId,
  outcome?
}
```

### 5.4 FCHV-specific tables

FCHVs don't classify — they screen, refer, and dispense commodities. Their flow is shorter and looks different from the facility flow, so it gets its own surface:

```ts
imnciFchvScreenings {
  id, facilityId, patientId, fchvUserId,
  visitedAt, location (jsonb: village/ward),
  dangerSignsFound (jsonb),  -- subset of CB-IMNCI danger signs FCHVs are trained to recognise
  referralRecommended (bool), referralUrgency
}

imnciFchvCommoditiesDispensed {
  id, screeningId, commodity: 'ors' | 'zinc' | 'iron' | 'chlorhexidine' | 'misoprostol' | 'other',
  quantity, unit, batchNo?, dispensedAt
}
```

These don't create an `encounter` (FCHVs are not encounter-generating clinicians in this model). If you later want them to, that's a small bridge.

---

## 6. API surface

All endpoints mounted under `APP_CONFIG.API_PREFIX` (`/api/v1`), gated by `authMiddleware`, response envelope `{ success, message, data }` per `BaseController`.

### 6.1 Facility clinician flow (`CLINICAL_WRITE_ROLES`)

| Method | Path                                       | Purpose                                                                                                                              |
| ------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| POST   | `/imnci/visits`                            | Start visit for a patient. Server creates `encounters` row + `imnci_visits` row, pins booklet, returns visit id and question schema. |
| GET    | `/imnci/visits/:id`                        | Visit detail (answers + classifications + plan).                                                                                     |
| PATCH  | `/imnci/visits/:id/answers`                | Incremental save. Idempotent by `questionKey` — latest wins.                                                                         |
| POST   | `/imnci/visits/:id/classify`               | Run engine. Returns classifications + recommended plan items. Replays safely.                                                        |
| POST   | `/imnci/visits/:id/treatment-plan/confirm` | Worker confirms/overrides items, locks visit, schedules follow-ups, closes encounter.                                                |
| POST   | `/imnci/visits/:id/refer`                  | Create referral (pink-severity flow). Records pre-referral treatment given.                                                          |
| GET    | `/imnci/visits`                            | List with `SqlFilter` DSL (by date, classification, status, patient).                                                                |
| GET    | `/imnci/follow-ups`                        | Worklist; defaults to `dueOn <= today AND status = 'scheduled'`.                                                                     |
| POST   | `/imnci/follow-ups/:id/complete`           | Mark as completed when child returns; optionally links to new visit.                                                                 |

### 6.2 FCHV flow (`COMMUNITY_WRITE_ROLES`)

| Method | Path                                   | Purpose                                                              |
| ------ | -------------------------------------- | -------------------------------------------------------------------- |
| POST   | `/imnci/fchv/screenings`               | Record a household screening: danger signs found, referral decision. |
| POST   | `/imnci/fchv/screenings/:id/dispensed` | Log commodities dispensed (ORS/zinc/iron/chlorhexidine).             |
| GET    | `/imnci/fchv/screenings`               | FCHV's own screening history.                                        |

FCHVs do **not** get write access to `/imnci/visits/*`. Enforce in route definition with `authorize([...COMMUNITY_WRITE_ROLES])` for the FCHV routes, `authorize([...CLINICAL_WRITE_ROLES])` for clinical routes.

### 6.3 Reference data

| Method | Path                                     | Purpose                                                                                                  |
| ------ | ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| GET    | `/imnci/reference/chart-booklets/active` | Booklet active for caller's facility (id + version).                                                     |
| GET    | `/imnci/reference/chart-booklets/:id`    | Full booklet bundle (questions, classifications, drug refs) for client form rendering and offline cache. |
| GET    | `/imnci/reference/formulary/:bookletId`  | Drug list with dose tables.                                                                              |

These are read-only, cacheable, and a natural candidate for ETag / `If-None-Match`.

---

## 7. Classification engine

A pure service, no DB access of its own beyond what the visit service passes in:

```ts
interface ClassificationInput {
  patient: { ageMonths: number; weightKg: number; sex: "M" | "F" };
  answers: Record<string /*questionKey*/, boolean | number | string>;
  booklet: { rules: ClassificationRule[] }; // already loaded by caller
}

interface ClassificationResult {
  classifications: Array<{
    code: string;
    severity: "pink" | "yellow" | "green";
    section: string;
    ruleId: string;
  }>;
}
```

**Predicate format** mirrors your `SqlFilter` DSL so anyone who's touched search code recognises it:

```jsonc
{
  "and": [
    { "field": "answers.cough.duration_days", "op": ">=", "value": 14 },
    { "field": "answers.cough.chest_indrawing", "op": "=", "value": true },
  ],
}
```

**Algorithm**

1. Group rules by `section`.
2. Within each section, sort by `priority` (pink rules first).
3. Evaluate predicates against the answer set + patient attributes.
4. First match per section becomes the section's classification. Stop scanning that section.
5. Concatenate per-section results.
6. Special case: any `danger_signs` pink result forces _every_ qualifying main-symptom classification to be treated as severe for referral purposes (the protocol's "general danger sign → urgent referral" rule). Implement as a post-pass over the result set.

**Treatment plan generation** is a second pass: for each classification, look up `imnci_treatment_rules`, compute weight-banded doses against `imnciFormulary`, emit `imnci_treatment_plan_items` in `recommended` status.

**Test strategy:** golden-case Jest fixtures. Each is `{ patient, answers, expectedClassifications, expectedPlanItems }`. Easy to author from the CB-IMNCI chart booklet, easy to extend when rules change, fast to run.

---

## 8. RBAC

No new roles. Reuse:

| Endpoint group            | Authorize                               |
| ------------------------- | --------------------------------------- |
| `/imnci/visits/*` (write) | `authorize([...CLINICAL_WRITE_ROLES])`  |
| `/imnci/visits/*` (read)  | `authorize([...CLINICAL_READ_ROLES])`   |
| `/imnci/follow-ups/*`     | `CLINICAL_WRITE_ROLES`                  |
| `/imnci/fchv/*`           | `authorize([...COMMUNITY_WRITE_ROLES])` |
| `/imnci/reference/*`      | any authenticated user                  |
| Booklet/rule admin        | `authorize([...ADMIN_ONLY_ROLES])`      |

Facility scoping is automatic via `FacilityRepository.withFacilityScope`. Cross-facility referrals are the one place to be careful — the receiving facility's read needs to be allowed; either expose a narrow `/imnci/referrals/incoming` endpoint that joins on `toFacilityId`, or replicate via a notification record.

---

## 9. Phasing

### Phase 0 — foundation (~1 week)

- [ ] Add `'imnci'` to encounter type enum.
- [ ] Add schema tables from §5. Generate migration: `yarn db:generate --name imnci_initial`.
- [ ] Seed CB-IMNCI Nepal booklet v1 (questions + classification rules + formulary + counselling) in `src/db/seeds/imnci/`.
- [ ] Write the classification engine with Jest fixtures for ~5 canonical cases (severe pneumonia, pneumonia, no pneumonia; severe dehydration, some dehydration, no dehydration; danger sign + cough; etc.).

### Phase 1 — MVP (~3–4 weeks)

- [ ] Visit lifecycle endpoints (§6.1) end-to-end.
- [ ] FCHV screening + dispensing endpoints (§6.2).
- [ ] Reference data endpoints (§6.3) with ETag.
- [ ] Follow-up worklist.
- [ ] Referral creation.
- [ ] Integration tests covering the three colour bands and the danger-signs post-pass.

### Phase 2

- [ ] Sick Young Infant pathway (0–2 months) — additional booklet sections + rules + drugs.
- [ ] HMIS-shape aggregate report endpoints (monthly per facility, by classification).
- [ ] FHIR projection: IMNCI classifications → `Condition`, treatment plan → `CarePlan`, dispensed commodities → `MedicationDispense`. Plug into existing `fhir-resource.mappers.ts`.

### Phase 3

- [ ] Offline sync for FCHV mobile clients (revisit ID strategy → client-generated UUIDs at write endpoints).
- [ ] Supervisor dashboards / drill-down.
- [ ] Booklet versioning workflow (draft → review → activate) with municipality scoping.

---

## 10. Open questions

1. **Booklet source of truth.** Do you have a clinical lead who can sign off on the seeded CB-IMNCI rules, or should we extract them from the MoHP chart booklet PDF and have someone review? This is the highest-risk content step.
2. **Encounter enum.** Confirm the exact column name + whether it's a Postgres enum (requires `ALTER TYPE ADD VALUE`) or a string check.
3. **Patient identifier.** Does CB-IMNCI in your deployment use a child registration number distinct from the existing patient identifiers? If yes, add a `patient_identifiers` type code (no new table needed).
4. **FCHV → facility linkage.** FCHVs are typically affiliated with a Health Post. Does your `user_facility_affiliations` already model this, or do FCHVs need a separate affiliation type?
5. **HMIS reporting.** Is this a phase-2 read API (your team builds the dashboard), or do you also push aggregates to an external MoHP HMIS system (DHIS2)? The latter changes how we emit events.
6. **Languages.** Forms and counselling in Nepali only, or Nepali + English? Affects the `language` column on `imnciCounsellingMessages` and the question prompts (key-based i18n vs. column-per-language).

---

## 11. Out of scope (explicit)

- Patient/Person creation flows (already exist).
- Auth, JWT, facility context (already exist).
- Telehealth integration — IMNCI visits are in-person.
- Inventory management for commodities beyond _what was dispensed at this screening_. If you want stock-on-hand tracking for FCHV commodities, that's a separate module.
