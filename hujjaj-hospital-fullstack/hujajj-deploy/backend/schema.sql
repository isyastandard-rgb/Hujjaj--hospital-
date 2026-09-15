-- Hujajj Hospital & Tech Hub — schema (PostgreSQL)

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('staff','admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No default user is seeded here on purpose — a hardcoded password in a
-- SQL file that ends up in version control is a real risk. Create your
-- first account with:  npm run create-admin


CREATE TABLE IF NOT EXISTS patient_records (
  id          TEXT PRIMARY KEY,           -- patient number, e.g. HJJ-001
  name        TEXT NOT NULL,
  gender      TEXT NOT NULL,
  diagnosis   TEXT NOT NULL,
  test        TEXT,
  result      TEXT,
  treatment   TEXT,
  remark      TEXT,
  created_by  TEXT,                       -- username of the staff member who entered it
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_records_name ON patient_records (lower(name));

-- Seed data (safe to run more than once — matches the demo rows the
-- frontend used to ship with). Remove this block if you don't want it.
INSERT INTO patient_records (id, name, gender, diagnosis, test, result, treatment, remark)
VALUES
  ('HJJ-001', 'Aisha Musa',    'Female', 'Malaria',       'Malaria RDT',      'Positive', 'Artesunate 200mg',     'Review in 5 days'),
  ('HJJ-002', 'Ibrahim Saleh', 'Male',   'Typhoid Fever', 'Widal Test',       'Positive', 'Ciprofloxacin 500mg',  'Bed rest, high fluid intake'),
  ('HJJ-003', 'Fatima Umar',   'Female', 'Anaemia',       'Full Blood Count', 'Negative', 'Iron supplements',     'Dietary advice given'),
  ('HJJ-004', 'Yusuf Bello',   'Male',   'Hypertension',  'BP Monitoring',    'Pending',  'Amlodipine 5mg',       'Weekly BP check'),
  ('HJJ-005', 'Hauwa Garba',   'Female', 'UTI',           'Urinalysis',       'Positive', 'Nitrofurantoin 100mg', 'Increase water intake')
ON CONFLICT (id) DO NOTHING;
