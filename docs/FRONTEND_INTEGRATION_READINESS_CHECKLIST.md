# Frontend Integration Readiness Checklist

Use this checklist before and during frontend integration with `shg-api`.

Scope:
- REST endpoints under `/api/v1/*`
- FHIR search endpoints under `/api/v1/fhir/*`
- Auth/session, telehealth, and environment readiness

---

## 1) Environment and Access

- [ ] Frontend has correct API base URL for target environment (`dev`, `staging`, `prod`).
- [ ] CORS allows frontend origin(s) for each environment.
- [ ] `.env` values are configured and verified:
  - [ ] `DATABASE_URL`
  - [ ] `JWT_SECRET`
  - [ ] JaaS values (if telehealth is enabled)
  - [ ] SMTP values (if email notifications are enabled)
- [ ] Database migrations are applied.
- [ ] Seed data is available for frontend QA/demo users.
- [ ] API health endpoint responds: `GET /api/v1/health`.

---

## 2) Authentication and Session Lifecycle

- [ ] `POST /api/v1/auth/login` works with valid credentials.
- [ ] Login failure states are handled in UI (invalid credentials, locked account, inactive account).
- [ ] Access token is stored securely on frontend.
- [ ] Refresh token strategy is implemented (cookie or secure storage as per frontend policy).
- [ ] `POST /api/v1/auth/refresh` is wired in HTTP interceptor/retry flow.
- [ ] `POST /api/v1/auth/logout` clears local auth state and server session.
- [ ] Frontend handles expired/invalid token (`401`) by refresh or redirect to login.
- [ ] Authenticated requests always send `Authorization: Bearer <token>`.

---

## 3) API Contract Alignment

- [ ] Team confirms mixed response contract:
  - [ ] Non-FHIR routes return `{ success, message, data }`
  - [ ] FHIR routes return raw `Bundle` JSON
- [ ] Shared error-handling format is agreed for UI notifications.
- [ ] Date/time format expectations are aligned (ISO string handling + timezone display strategy).
- [ ] Nullable fields are handled defensively in UI models.
- [ ] Pagination/query conventions are aligned per route:
  - [ ] page/pageSize style routes
  - [ ] FHIR `_count` and `_offset` routes

---

## 4) Core Module Integration (REST)

### Patients
- [ ] Patient list view works with filters/search.
- [ ] Patient create form matches current person-first payload model.
- [ ] Patient detail page hydrates name/phone from person-linked fields.

### Encounters and Visits
- [ ] Encounter list and detail render correctly.
- [ ] Encounter create/update workflows are tested with real patient records.
- [ ] Visit-driven navigation is aligned with current backend route semantics.

### Users and Roles
- [ ] User listing and role-related UI reflect current auth role model.
- [ ] Unauthorized-role UI states are covered.

### Attachments
- [ ] Upload flow works end-to-end.
- [ ] File metadata rendering and download/open behavior are validated.

### Family Planning / MCH Modules
- [ ] Family planning forms map to backend payloads.
- [ ] ANC/PNC/growth/immunization related pages use correct route and fields.

### Telehealth
- [ ] Appointment booking UI works (`doctor`, `patient`, `date/time`, service context).
- [ ] Join flow works for doctor/patient roles.
- [ ] UI handles unavailable/invalid meeting link states gracefully.

---

## 5) FHIR Integration (Read/Search)

- [ ] Frontend client can consume FHIR Bundle structure (`resourceType`, `total`, `entry[]`).
- [ ] Search screens are mapped to current endpoints:
  - [ ] `/fhir/Patient`
  - [ ] `/fhir/Observation`
  - [ ] `/fhir/Condition`
  - [ ] `/fhir/MedicationRequest`
  - [ ] `/fhir/Encounter`
  - [ ] `/fhir/AllergyIntolerance`
  - [ ] `/fhir/Appointment`
  - [ ] `/fhir/DocumentReference`
  - [ ] `/fhir/Organization`
  - [ ] `/fhir/PractitionerRole`
  - [ ] `/fhir/EpisodeOfCare`
  - [ ] `/fhir/CarePlan`
  - [ ] `/fhir/Immunization`
- [ ] Query parameter support used by UI is validated (`_id`, `subject`, `patient`, `code`, `date`, `_count`, `_offset`).
- [ ] `_include` and `_revinclude` paths used by UI are verified.
- [ ] UI parser handles profile metadata (`meta.profile`) without breaking.

---

## 6) TanStack Query Readiness

- [ ] Query keys include tenant/user context where needed.
- [ ] Token refresh does not create infinite retry loops.
- [ ] Stale time and refetch policies are tuned by screen type.
- [ ] Mutation invalidation strategy is defined per module.
- [ ] Optimistic updates are only used where backend behavior is deterministic.
- [ ] Error boundary + toast policy is consistent across pages.

---

## 7) Data and UX Quality Gates

- [ ] Empty states for all list/search pages.
- [ ] Loading skeletons/spinners for network-bound views.
- [ ] Retry flows for transient errors.
- [ ] Human-readable error messages for validation/server errors.
- [ ] Required fields and server-side validation errors are surfaced on forms.
- [ ] Timezone-safe display for encounter, appointment, and observation dates.

---

## 8) Security and Compliance Checks

- [ ] Frontend never logs secrets/tokens in console.
- [ ] Token storage mechanism is approved for environment risk level.
- [ ] Role-guarded routes are enforced on frontend and backend.
- [ ] Facility-scoped data leaks are tested (cross-facility access attempts must fail).
- [ ] Audit-sensitive actions are verified from UI journey perspective.

---

## 9) Performance Readiness

- [ ] List screens use pagination (no unbounded fetches).
- [ ] FHIR searches request bounded `_count`.
- [ ] Debounced search inputs for high-frequency filters.
- [ ] N+1 API call patterns are reduced via include/revinclude or batch fetches.
- [ ] Large forms split into steps or lazy-loaded sections where needed.

---

## 10) Test and Release Gate

- [ ] Smoke test completed for critical flows:
  - [ ] login -> dashboard
  - [ ] patient create -> patient detail
  - [ ] encounter create -> encounter list/detail
  - [ ] telehealth book -> join
  - [ ] at least 3 FHIR search screens
- [ ] API contract snapshot (request/response examples) shared with frontend team.
- [ ] Known gaps tracked as tickets with owner + ETA.
- [ ] Rollback plan defined for frontend release.
- [ ] Monitoring/alerts available for API errors in integration environment.

---

## 11) Sign-Off

- [ ] Backend lead sign-off
- [ ] Frontend lead sign-off
- [ ] QA sign-off
- [ ] Product/clinical workflow sign-off

Completion date:
- [ ] ____________________

Release target:
- [ ] ____________________

