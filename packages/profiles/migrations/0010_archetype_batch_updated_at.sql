-- Sprint 07: align archetype suggestion batches with the shared Drizzle timestamp contract.
-- Forward-only and idempotent.

BEGIN;

ALTER TABLE IF EXISTS profile.archetype_suggestion_batches
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMIT;