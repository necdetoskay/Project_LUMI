CREATE TABLE IF NOT EXISTS profile.generation_context_snapshots (
  digest varchar(64) PRIMARY KEY,
  store varchar(120) NOT NULL,
  snapshot_version varchar(40) NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT generation_context_snapshots_digest_sha256_check
    CHECK (digest ~ '^[0-9a-f]{64}$')
);

CREATE INDEX IF NOT EXISTS generation_context_snapshots_store_version_idx
  ON profile.generation_context_snapshots (store, snapshot_version);

COMMENT ON TABLE profile.generation_context_snapshots IS
  'Immutable content-addressed generation context snapshots used for exact replay.';
