-- Phase 1 global-search infrastructure.
--
-- Adds the pg_trgm extension and GIN trigram indexes on the columns the
-- search runners hit with similarity() and the `%` operator. Lets
-- `WHERE column ILIKE '%foo%'` and `WHERE column % 'foo'` queries scan
-- via the index instead of seq-scanning every row.
--
-- The extension and `USING GIN ... gin_trgm_ops` aren't expressible in
-- Drizzle schema, so this migration is hand-written rather than generated
-- via drizzle-kit. Re-running it is safe: every statement uses IF NOT EXISTS.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Patient identity (person_names): both halves of the name.
CREATE INDEX IF NOT EXISTS person_names_given_trgm_idx
  ON person_names USING GIN (given gin_trgm_ops);

CREATE INDEX IF NOT EXISTS person_names_family_trgm_idx
  ON person_names USING GIN (family gin_trgm_ops);

-- Patient ID (e.g. "PAT-00231"). Used for prefix and exact matches; the
-- trigram index also helps `ILIKE '%PAT%'` typeahead.
CREATE INDEX IF NOT EXISTS patients_patient_id_trgm_idx
  ON patients USING GIN (patient_id gin_trgm_ops);

-- Person identifiers (national ID, MRN, etc.).
CREATE INDEX IF NOT EXISTS person_identifiers_value_trgm_idx
  ON person_identifiers USING GIN (value gin_trgm_ops);

-- Person contacts (phone, email).
CREATE INDEX IF NOT EXISTS person_contacts_value_trgm_idx
  ON person_contacts USING GIN (value gin_trgm_ops);

-- Practitioner name fields (users.first_name, users.last_name).
CREATE INDEX IF NOT EXISTS users_first_name_trgm_idx
  ON users USING GIN (first_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS users_last_name_trgm_idx
  ON users USING GIN (last_name gin_trgm_ops);
