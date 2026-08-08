-- ULTEF/S23 hardening: retain the producing story session on indirect-effect intents.
-- Existing rows remain valid; new world-commit rows populate the field.

ALTER TABLE story.story_outbox
  ADD COLUMN IF NOT EXISTS story_session_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_story_outbox_session'
  ) THEN
    ALTER TABLE story.story_outbox
      ADD CONSTRAINT fk_story_outbox_session
      FOREIGN KEY (story_session_id) REFERENCES story.story_sessions(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS story_outbox_session_idx
  ON story.story_outbox (story_session_id);
