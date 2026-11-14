-- Initial schema for a NEW CaseFlow database. Do not apply to legacy tables.
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL CHECK (length(btrim(full_name)) > 0),
  email TEXT NOT NULL UNIQUE CHECK (length(btrim(email)) > 0),
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'agent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cases (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(btrim(title)) > 0),
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'New'
    CHECK (status IN ('New', 'In Progress', 'Awaiting Response', 'Closed')),
  priority TEXT NOT NULL DEFAULT 'Medium'
    CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  due_date DATE,
  assigned_to INTEGER REFERENCES users(id),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE case_notes (
  id SERIAL PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  note_text TEXT NOT NULL CHECK (length(btrim(note_text)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE case_activity (
  id SERIAL PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  action_type TEXT NOT NULL,
  action_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX case_notes_case_time_idx ON case_notes (case_id, created_at DESC);
CREATE INDEX case_activity_case_time_idx ON case_activity (case_id, created_at DESC);
