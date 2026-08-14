ALTER TABLE profile.ai_generation_traces
  ADD COLUMN IF NOT EXISTS estimated_cost_usd_micros bigint,
  ADD COLUMN IF NOT EXISTS cost_source varchar(40),
  ADD COLUMN IF NOT EXISTS pricing_snapshot jsonb;

COMMENT ON COLUMN profile.ai_generation_traces.estimated_cost_usd_micros IS
  'Estimated generation cost in millionths of a USD. Null when pricing or usage is unavailable.';
COMMENT ON COLUMN profile.ai_generation_traces.cost_source IS
  'How cost was obtained, for example provider_reported or pricing_snapshot.';
COMMENT ON COLUMN profile.ai_generation_traces.pricing_snapshot IS
  'Immutable pricing inputs used for the estimate so historical traces remain auditable.';
