-- Sprint 08: World domain event store
-- Additive migration: creates event store table for domain event persistence and replay
-- Preserves all existing data

BEGIN;

CREATE TABLE IF NOT EXISTS profile.world_event_store (
  id UUID PRIMARY KEY,
  world_id UUID NOT NULL,
  event_type VARCHAR(30) NOT NULL,
  event_version INTEGER NOT NULL DEFAULT 1,
  aggregate_version INTEGER NOT NULL DEFAULT 1,
  actor_household_id UUID,
  actor_user_id UUID,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT wes_event_type_check CHECK (
    event_type IN (
      'WORLD_CREATED',
      'WORLD_ARCHIVED',
      'REGION_ADDED',
      'REGION_UPDATED',
      'LOCATION_ADDED',
      'LOCATION_UPDATED',
      'HOME_CREATED',
      'HOME_UPDATED',
      'CHARACTER_ARRIVED',
      'CHARACTER_MOVED',
      'CHARACTER_RETURNED_HOME',
      'CHECKPOINT_CREATED'
    )
  )
);

CREATE INDEX IF NOT EXISTS wes_world_event_idx ON profile.world_event_store (world_id, created_at);
CREATE INDEX IF NOT EXISTS wes_created_at_idx ON profile.world_event_store (created_at);

COMMIT;
