CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS parent_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS parent_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES parent_accounts(id) ON DELETE CASCADE,
  refresh_token_hash text NOT NULL UNIQUE,
  session_family_id uuid NOT NULL DEFAULT gen_random_uuid(),
  remember_me boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_refreshed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  replaced_by_session_id uuid
);

CREATE TABLE IF NOT EXISTS parent_password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES parent_accounts(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

ALTER TABLE parent_sessions ADD COLUMN IF NOT EXISTS session_family_id uuid;
ALTER TABLE parent_sessions ADD COLUMN IF NOT EXISTS remember_me boolean;
ALTER TABLE parent_sessions ADD COLUMN IF NOT EXISTS last_refreshed_at timestamptz;
ALTER TABLE parent_sessions ADD COLUMN IF NOT EXISTS replaced_by_session_id uuid;

UPDATE parent_sessions
SET
  session_family_id = COALESCE(session_family_id, gen_random_uuid()),
  remember_me = COALESCE(remember_me, false),
  last_refreshed_at = COALESCE(last_refreshed_at, created_at);

ALTER TABLE parent_sessions ALTER COLUMN session_family_id SET DEFAULT gen_random_uuid();
ALTER TABLE parent_sessions ALTER COLUMN session_family_id SET NOT NULL;
ALTER TABLE parent_sessions ALTER COLUMN remember_me SET DEFAULT false;
ALTER TABLE parent_sessions ALTER COLUMN remember_me SET NOT NULL;
ALTER TABLE parent_sessions ALTER COLUMN last_refreshed_at SET DEFAULT now();
ALTER TABLE parent_sessions ALTER COLUMN last_refreshed_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'parent_sessions_replaced_by_session_id_fkey'
  ) THEN
    ALTER TABLE parent_sessions
      ADD CONSTRAINT parent_sessions_replaced_by_session_id_fkey
      FOREIGN KEY (replaced_by_session_id)
      REFERENCES parent_sessions(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS parent_sessions_parent_id_idx
  ON parent_sessions(parent_id);
CREATE INDEX IF NOT EXISTS parent_sessions_active_idx
  ON parent_sessions(refresh_token_hash)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS parent_sessions_family_id_idx
  ON parent_sessions(session_family_id);
CREATE INDEX IF NOT EXISTS parent_password_reset_tokens_parent_id_idx
  ON parent_password_reset_tokens(parent_id);
