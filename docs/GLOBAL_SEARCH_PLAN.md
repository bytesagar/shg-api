# Global Search — Backend Plan

## Goals

A header-level search across the EMR that surfaces patients, clinical records,
appointments, and practitioners with role- and facility-aware scoping. Backend
returns categorized hits with the identifiers a client needs to navigate;
**URL construction lives in the frontend** so route conventions can change
without API churn.

Ship in two phases: a tight MVP that covers the high-frequency entities, then
a broader pass that adds the long tail and the full-results page.

---

## Result payload contract

The backend never sends URLs. Each hit carries a discriminator (`type`) and a
`context` object with the IDs the frontend needs to construct a route.

```jsonc
{
  "type": "patient", // entity discriminator
  "id": "9a7c…", // primary key of this entity
  "title": "Shanti Bhattarai",
  "subtitle": "PAT-00231 · F, 34y · Bharatpur HP",
  "context": {
    // IDs the frontend needs to build a URL
    "patient_id": "9a7c…",
    "facility_id": "f1…",
  },
  "matched_field": "given_name",
  "score": 0.91,
}
```

The frontend owns a `routeFor(hit)` helper that maps `type + context` → URL.
Adding a new entity means:

1. Backend adds a runner that emits hits with the right `context`.
2. Frontend adds a case to `routeFor`.

No coupling beyond the shared `type` vocabulary.

---

## Phase 1 — MVP

Ship the high-frequency search path. Covers roughly 85% of expected queries
(patient names, appointment lookups, doctor name search).

### Endpoints

```
GET  /api/search              # typeahead dropdown
GET  /api/search/empty-state  # data for empty dropdown
```

No paginated full-results endpoint yet — that's Phase 2.

### Entities covered

| `type`         | Source tables                                                                  | `context` returned                            |
| -------------- | ------------------------------------------------------------------------------ | --------------------------------------------- |
| `patient`      | `patients`, `persons`, `person_names`, `person_identifiers`, `person_contacts` | `patient_id`, `facility_id`                   |
| `appointment`  | `appointments` + patient/user joins                                            | `appointment_id`, `patient_id`, `doctor_id`   |
| `practitioner` | `practitioners`, `persons`, `users`, `practitioner_role_assignments`           | `practitioner_id`, `user_id?`, `facility_id?` |
| `visit`        | `visits` + patient join                                                        | `visit_id`, `patient_id`                      |
| `encounter`    | `encounters` + patient join                                                    | `encounter_id`, `visit_id`, `patient_id`      |

Frontend URL conventions (informative — owned by frontend, not the API):

- `patient` → `/patients/{patient_id}`
- `appointment` → `/appointments/{appointment_id}`
- `practitioner` → `/practitioners/{practitioner_id}`
- `visit` → `/patients/{patient_id}/visits/{visit_id}`
- `encounter` → `/patients/{patient_id}/encounters/{encounter_id}`

### Request / response shapes

**`GET /api/search?q=…&limit=5&types=…`**

| Param         | Default     | Notes                                      |
| ------------- | ----------- | ------------------------------------------ |
| `q`           | required    | trimmed, 1–200 chars                       |
| `types`       | all phase-1 | comma list                                 |
| `limit`       | `5`         | per-category, max `10`                     |
| `facility_id` | —           | **admin only**, silently ignored otherwise |

Response:

```jsonc
{
  "query": "shanti",
  "classification": "name",
  "took_ms": 84,
  "partial": false,
  "categories": [
    {
      "type": "patient",
      "label": "Patients",
      "total": 3,
      "partial": false,
      "results": [
        /* SearchHit[] */
      ],
    },
  ],
}
```

**`GET /api/search/empty-state`**

```jsonc
{
  "upcoming_appointments": [
    /* SearchHit[] of type=appointment */
  ],
  "recent_patients": [
    /* SearchHit[] of type=patient */
  ],
}
```

Cached per user for ~30s; invalidated on appointment mutations.

### Authorization & scoping

Middleware resolves a `ScopeContext` at the start of every request:

```ts
type ScopeContext = {
  userId: string;
  role: "admin" | "facility" | "doctor" | "fchv" | "user";
  facilityId: string | null; // null = admin
  municipalityId: string | null;
};
```

Rules applied in the service layer:

| Role     | Default scope                                                                              |
| -------- | ------------------------------------------------------------------------------------------ |
| admin    | unrestricted; `facility_id` query param honoured                                           |
| facility | `facility_id = ctx.facilityId` on every facility-scoped table                              |
| doctor   | same as `facility` + recency boost on own patients (visit/encounter/appointment doctor_id) |
| fchv     | facility-scoped, further restricted to assigned patients (see Phase 2 prerequisite)        |
| user     | only own appointments                                                                      |

Soft-delete (`deleted_at IS NULL`) and consent-revocation filters applied
unconditionally in the base query builder. Non-admin passing `facility_id` is
silently ignored — don't 403, it just produces confusing UX.

### Query classification

Minimal version for Phase 1; drives column boost weights, not which categories run:

```ts
function classifyQuery(q: string): "phone" | "patient_id" | "name" | "numeric" {
  const t = q.trim();
  if (/^\d{7,}$/.test(t)) return "phone";
  if (/^[A-Z]{2,4}-?\d{2,}$/i.test(t)) return "patient_id";
  if (/^\d{1,6}$/.test(t)) return "numeric";
  return "name";
}
```

### Performance budget

- Per-category SQL: `SET LOCAL statement_timeout = '500ms'`
- Whole request: 1.5s hard cap; partial results returned with `partial: true`
- Empty `q` → `400 QUERY_REQUIRED` (client should call `/empty-state` instead)
- `q` shorter than 2 chars (non-numeric) → prefix-only matching, no trigram

### Rate limits

| Route                     | Limit     |
| ------------------------- | --------- |
| `/api/search`             | 120 / min |
| `/api/search/empty-state` | 30 / min  |

### Implementation tasks

1. Enable `pg_trgm` extension. Add GIN trigram indexes on:
   - `person_names.given`, `person_names.family`
   - `patients.patient_id`
   - `person_identifiers.value`, `person_contacts.value`
   - `users.first_name`, `users.last_name`
2. `ScopeContext` middleware (extract from session, attach to request).
3. Service-layer scaffold: `searchAll(ctx, q, opts)` orchestrator with per-entity
   runners and per-category timeouts via `Promise.allSettled`.
4. Implement Phase 1 runners: `searchPatients`, `searchAppointments`,
   `searchPractitioners`, `searchVisits`, `searchEncounters`.
5. `/api/search` and `/api/search/empty-state` routes.
6. Rate limits (120/min and 30/min respectively).
7. Integration tests covering each role's scope (admin, facility, doctor, fchv, user).

### Out of Phase 1

- Pagination / full-results page
- Free-text clinical search (diagnoses, complaints, tests)
- ICD-11 reference lookup
- Snippet / highlight extraction
- Cross-facility patient deduplication for admin

---

## Phase 2 — Extend

Adds the long-tail clinical entities, reference data, admin-only scopes, and
the full results page.

### Endpoints

```
GET  /api/search/:type        # paginated full results for one entity type
```

`:type` is one of the entity discriminators listed below. Cursor-based
pagination via an opaque `{score, id}` cursor — no `OFFSET`.

### Additional entities

| `type`               | Source tables                                   | `context` returned                                                                         | Notes               |
| -------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------- |
| `pregnancy`          | `pregnancies`                                   | `pregnancy_id`, `patient_id`                                                               | tier 1              |
| `diagnosis`          | `provisional_diagnoses`, `confirm_diagnoses`    | `diagnosis_id`, `kind` (`provisional`/`confirm`), `encounter_id`, `visit_id`, `patient_id` | tier 2 — free text  |
| `medication`         | `medications`                                   | `medication_id`, `encounter_id`, `visit_id`, `patient_id`                                  | tier 2              |
| `test`               | `tests`                                         | `test_id`, `encounter_id`, `visit_id`, `patient_id`                                        | tier 2 — free text  |
| `complaint`          | `complaints`                                    | `complaint_id`, `encounter_id`, `visit_id`, `patient_id`                                   | tier 2 — free text  |
| `child_immunization` | `child_immunizations`, `immunization_histories` | `child_immunization_id`, `patient_id`                                                      | tier 2              |
| `family_planning`    | `family_plannings`                              | `family_planning_id`, `patient_id`                                                         | tier 2              |
| `document`           | `documents`, `attachments`                      | `document_id`, `source_type`, `source_id`, `patient_id?`                                   | polymorphic         |
| `icd11`              | `icd11_codes`                                   | `code` (the code IS the identifier)                                                        | reference, no scope |
| `facility`           | `health_facilities`                             | `facility_id`                                                                              | admin only          |
| `user`               | `users`                                         | `user_id`                                                                                  | admin only          |

Frontend URL conventions (informative):

- `pregnancy` → `/patients/{patient_id}/pregnancies/{pregnancy_id}`
- `diagnosis` → `/patients/{patient_id}/encounters/{encounter_id}#diagnosis-{diagnosis_id}`
- `medication` → `/patients/{patient_id}/encounters/{encounter_id}#medication-{medication_id}`
- `test` → `/patients/{patient_id}/encounters/{encounter_id}#test-{test_id}`
- `complaint` → `/patients/{patient_id}/encounters/{encounter_id}#complaint-{complaint_id}`
- `child_immunization` → `/patients/{patient_id}/immunizations/{child_immunization_id}`
- `family_planning` → `/patients/{patient_id}/family-planning/{family_planning_id}`
- `document` → resolved by frontend from `source_type` + `source_id`
- `icd11` → `/icd11/{code}` (reference panel)
- `facility` → `/admin/facilities/{facility_id}`
- `user` → `/admin/users/{user_id}`

### `/api/search/:type` contract

```
GET /api/search/diagnosis?q=fever&cursor=…&limit=20&date_from=2026-01-01
```

| Param                 | Notes                                                                     |
| --------------------- | ------------------------------------------------------------------------- |
| `q`                   | required                                                                  |
| `cursor`              | opaque base64 of `{score, id}`; omitted on first page                     |
| `limit`               | default `20`, max `50`                                                    |
| type-specific filters | e.g. `date_from`, `date_to`, `doctor_id`, `service`, `gender`, `icd_code` |

Response:

```jsonc
{
  "type": "diagnosis",
  "query": "fever",
  "results": [
    /* SearchHit[] */
  ],
  "next_cursor": "eyJzY29yZSI6…", // null if exhausted
  "total_estimate": 142,
}
```

Rate limit: 60 / minute.

### Additional features

- **Free-text search** via `tsvector` GIN indexes on:
  - `provisional_diagnoses.description`
  - `confirm_diagnoses.description`
  - `complaints.title`, `complaints.description`
  - `tests.test_result`
  - `medications.medicine_name`
- **Snippet extraction** via `ts_headline()`, returned as `hit.snippet` on
  free-text matches.
- **ICD-11 lookup** — returned hits use `code` as identifier; not facility-scoped.
  "Patients with this diagnosis" is a separate call to
  `/api/search/diagnosis?icd_code=…`.
- **Cross-facility patient deduplication for admin** — when admin searches
  without `facility_id`, group rows sharing the same `person_id` and return
  one hit with `linked_patient_ids: [{patient_id, facility_id, facility_name}]`
  in `context`.
- **Extended query classification** — add `icd` and `email` shapes.
- **Document/attachment polymorphism** — `attachments` is polymorphic
  (`source_type`/`source_id`). The search runner packs both into `context`
  so the frontend can route correctly without a second roundtrip.

### Prerequisites

These should land before or alongside Phase 2 work:

1. **`fchv_patient_assignments` table** — explicit FCHV ↔ patient mapping.
   Without it, FCHV search can't reliably reach non-maternal patients in their
   caseload. Suggested shape:

   ```ts
   pgTable("fchv_patient_assignments", {
     id: uuid().primaryKey().defaultRandom(),
     fchvUserId: uuid()
       .notNull()
       .references(() => users.id),
     patientId: uuid()
       .notNull()
       .references(() => patients.id),
     facilityId: uuid().references(() => health_facilities.id),
     active: boolean().default(true).notNull(),
     assignedAt: timestamp().defaultNow().notNull(),
     // … audit columns
   });
   ```

2. **ICD-11 seed data** — `icd11_codes` populated with at least the Nepal
   short list (NMS-MMS subset).
3. **`audit_events` write path on destination routes** — search itself doesn't
   audit; clicking through to a patient/encounter/etc. does. The destination
   route middleware must already be writing audit events before Phase 2 ships.

### Implementation tasks

1. Phase 1 complete.
2. FCHV assignment table migration + backfill from existing `pregnancies.assigned_fchv_id` rows.
3. Add `tsvector` columns + GIN indexes on the free-text fields listed above
   (generated columns preferred over triggers).
4. Implement remaining runners: `searchPregnancies`, `searchDiagnoses`,
   `searchMedications`, `searchTests`, `searchComplaints`,
   `searchChildImmunizations`, `searchFamilyPlannings`, `searchDocuments`,
   `searchIcd11`, `searchFacilities` (admin), `searchUsers` (admin).
5. `/api/search/:type` route with keyset pagination + type-specific filters.
6. Cross-facility patient deduplication for admin searches.
7. Snippet extraction in free-text runners.
8. Rate limit on `/api/search/:type`: 60/min per user.
9. Performance regression suite: full-results queries against a 100k-patient
   seeded dataset, target p95 < 300ms.

---

## Out of scope (future)

- Saved searches / search history
- Cross-organisation federated search
- Voice input / Nepali transliteration ("शान्ति" ↔ "Shanti")
- ML-based intent classification (rule-based for now)
- Real-time index updates via CDC; Phases 1 & 2 rely on synchronous index
  writes within the same transaction as the source mutation

---

## Open decisions

| #   | Decision                                                                                      | Default if not raised                                           |
| --- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 1   | Should admin cross-facility search dedupe by `person_id`, or show every `patients` row?       | Dedupe, show "Also at N facilities" hint in subtitle            |
| 2   | Recency penalty for old encounters in ranking?                                                | 0.5× score multiplier for records older than 3 years            |
| 3   | Are `complaints` worth surfacing in search, or only via encounter view?                       | Surface in Phase 2 — patients often describe symptoms first     |
| 4   | Should ICD-11 search return matching codes only, or also encounters using those codes inline? | Codes only; "Patients with this diagnosis" is a separate action |
