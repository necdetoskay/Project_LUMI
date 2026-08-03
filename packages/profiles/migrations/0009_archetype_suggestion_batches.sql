-- Sprint 07: Server-side archetype suggestion batches for secure selection
-- Forward-only additive migration. Stores LLM-generated archetype batches with
-- server-controlled ids, expirations, and household scoping.

BEGIN;

CREATE TABLE IF NOT EXISTS profile.archetype_suggestion_batches (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  household_id UUID NOT NULL REFERENCES profile.households(id) ON DELETE CASCADE,
  child_profile_id UUID NOT NULL REFERENCES profile.child_profiles(id) ON DELETE CASCADE,
  archetypes JSONB NOT NULL,
  model_id TEXT NOT NULL,
  generation_nonce TEXT NOT NULL,
  excluded_concepts JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour')
);

CREATE INDEX IF NOT EXISTS archetype_suggestion_batches_household_idx
  ON profile.archetype_suggestion_batches (household_id);

CREATE INDEX IF NOT EXISTS archetype_suggestion_batches_child_idx
  ON profile.archetype_suggestion_batches (child_profile_id);

CREATE INDEX IF NOT EXISTS archetype_suggestion_batches_expiry_idx
  ON profile.archetype_suggestion_batches (expires_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'archetype_suggestion_batches_check'
  ) THEN
    ALTER TABLE profile.archetype_suggestion_batches
      ADD CONSTRAINT archetype_suggestion_batches_check
      CHECK (jsonb_typeof(archetypes) = 'array' AND jsonb_array_length(archetypes) = 5);
  END IF;
END $$;

COMMIT;
