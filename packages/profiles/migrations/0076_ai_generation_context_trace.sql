-- Persist privacy-safe generation-context audit evidence for Context Inspector.
ALTER TABLE profile.ai_generation_traces
  ADD COLUMN IF NOT EXISTS context_fingerprint varchar(64),
  ADD COLUMN IF NOT EXISTS context_provenance jsonb;
