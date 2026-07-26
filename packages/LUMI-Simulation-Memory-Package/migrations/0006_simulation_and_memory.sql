BEGIN;

CREATE TABLE simulation.simulation_policies (
  world_id UUID PRIMARY KEY REFERENCES world.worlds(id) ON DELETE CASCADE,
  policy_code VARCHAR(80) NOT NULL DEFAULT 'default',
  max_catch_up_days INTEGER NOT NULL DEFAULT 10 CHECK (max_catch_up_days BETWEEN 0 AND 30),
  full_intensity_days INTEGER NOT NULL DEFAULT 1,
  minimum_intensity REAL NOT NULL DEFAULT 0.1 CHECK (minimum_intensity BETWEEN 0 AND 1),
  freeze_after_limit BOOLEAN NOT NULL DEFAULT TRUE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  CHECK (full_intensity_days BETWEEN 0 AND max_catch_up_days)
);

CREATE TABLE simulation.simulation_runs (
  id UUID PRIMARY KEY,
  world_id UUID NOT NULL REFERENCES world.worlds(id) ON DELETE CASCADE,
  run_type VARCHAR(40) NOT NULL DEFAULT 'catch_up',
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  requested_from TIMESTAMPTZ NOT NULL,
  requested_to TIMESTAMPTZ NOT NULL,
  effective_from TIMESTAMPTZ,
  effective_to TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (run_type IN ('catch_up','scheduled','manual','story_triggered')),
  CHECK (status IN ('pending','running','completed','failed','skipped')),
  CHECK (requested_to >= requested_from)
);

CREATE TABLE simulation.simulation_checkpoints (
  id UUID PRIMARY KEY,
  world_id UUID NOT NULL REFERENCES world.worlds(id) ON DELETE CASCADE,
  simulation_run_id UUID REFERENCES simulation.simulation_runs(id) ON DELETE SET NULL,
  checkpoint_at TIMESTAMPTZ NOT NULL,
  cursor JSONB NOT NULL DEFAULT '{}'::jsonb,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE simulation.simulation_events (
  id UUID PRIMARY KEY,
  simulation_run_id UUID NOT NULL REFERENCES simulation.simulation_runs(id) ON DELETE CASCADE,
  world_id UUID NOT NULL REFERENCES world.worlds(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  intensity REAL NOT NULL DEFAULT 0.5,
  importance REAL NOT NULL DEFAULT 0.5,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE simulation.state_changes (
  id UUID PRIMARY KEY,
  simulation_event_id UUID NOT NULL REFERENCES simulation.simulation_events(id) ON DELETE CASCADE,
  entity_type VARCHAR(80) NOT NULL,
  entity_id UUID NOT NULL,
  path VARCHAR(240) NOT NULL,
  previous_value JSONB,
  next_value JSONB,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE simulation.background_actions (
  id UUID PRIMARY KEY,
  simulation_run_id UUID NOT NULL REFERENCES simulation.simulation_runs(id) ON DELETE CASCADE,
  actor_character_id UUID REFERENCES character.characters(id) ON DELETE SET NULL,
  action_code VARCHAR(100) NOT NULL,
  relevance_score REAL NOT NULL DEFAULT 0.5 CHECK (relevance_score BETWEEN 0 AND 1),
  utility_score REAL NOT NULL DEFAULT 0.5 CHECK (utility_score BETWEEN 0 AND 1),
  scheduled_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  status VARCHAR(40) NOT NULL DEFAULT 'resolved',
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  CHECK (status IN ('planned','resolved','cancelled','failed'))
);

CREATE TABLE simulation.entity_time_profiles (
  world_id UUID NOT NULL REFERENCES world.worlds(id) ON DELETE CASCADE,
  entity_type VARCHAR(80) NOT NULL,
  entity_id UUID NOT NULL,
  base_time_sensitivity REAL NOT NULL DEFAULT 0.5 CHECK (base_time_sensitivity BETWEEN 0 AND 1),
  current_priority REAL NOT NULL DEFAULT 0.5 CHECK (current_priority BETWEEN 0 AND 1),
  last_simulated_at TIMESTAMPTZ,
  next_relevant_at TIMESTAMPTZ,
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (world_id, entity_type, entity_id)
);

CREATE TABLE memory.memories (
  id UUID PRIMARY KEY,
  world_id UUID NOT NULL REFERENCES world.worlds(id) ON DELETE CASCADE,
  memory_type VARCHAR(80) NOT NULL,
  source_type VARCHAR(80) NOT NULL,
  source_id UUID,
  occurred_at TIMESTAMPTZ NOT NULL,
  importance REAL NOT NULL DEFAULT 0.5 CHECK (importance BETWEEN 0 AND 1),
  emotional_weight REAL NOT NULL DEFAULT 0 CHECK (emotional_weight BETWEEN -1 AND 1),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE memory.memory_subjects (
  memory_id UUID NOT NULL REFERENCES memory.memories(id) ON DELETE CASCADE,
  subject_type VARCHAR(80) NOT NULL,
  subject_id UUID NOT NULL,
  relevance_weight REAL NOT NULL DEFAULT 0.5,
  PRIMARY KEY (memory_id, subject_type, subject_id)
);

CREATE TABLE memory.memory_links (
  source_memory_id UUID NOT NULL REFERENCES memory.memories(id) ON DELETE CASCADE,
  target_memory_id UUID NOT NULL REFERENCES memory.memories(id) ON DELETE CASCADE,
  link_type VARCHAR(60) NOT NULL DEFAULT 'related',
  strength REAL NOT NULL DEFAULT 0.5 CHECK (strength BETWEEN 0 AND 1),
  PRIMARY KEY (source_memory_id, target_memory_id, link_type),
  CHECK (source_memory_id <> target_memory_id)
);

CREATE TABLE memory.memory_summaries (
  id UUID PRIMARY KEY,
  world_id UUID NOT NULL REFERENCES world.worlds(id) ON DELETE CASCADE,
  subject_type VARCHAR(80) NOT NULL,
  subject_id UUID NOT NULL,
  summary_level VARCHAR(40) NOT NULL DEFAULT 'recent',
  source_memory_count INTEGER NOT NULL DEFAULT 0,
  summary_text TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE memory.memory_relevance (
  memory_id UUID NOT NULL REFERENCES memory.memories(id) ON DELETE CASCADE,
  context_type VARCHAR(80) NOT NULL,
  context_id UUID NOT NULL,
  relevance_score REAL NOT NULL CHECK (relevance_score BETWEEN 0 AND 1),
  reason JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (memory_id, context_type, context_id)
);

CREATE TABLE memory.memory_embeddings (
  memory_id UUID NOT NULL REFERENCES memory.memories(id) ON DELETE CASCADE,
  model_code VARCHAR(160) NOT NULL,
  dimensions INTEGER NOT NULL,
  vector_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (memory_id, model_code)
);

COMMIT;
