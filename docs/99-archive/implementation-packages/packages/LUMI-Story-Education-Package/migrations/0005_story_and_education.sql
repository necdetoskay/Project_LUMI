BEGIN;

CREATE TABLE story.stories (
  id UUID PRIMARY KEY,
  world_id UUID NOT NULL REFERENCES world.worlds(id) ON DELETE CASCADE,
  child_profile_id UUID REFERENCES profile.child_profiles(id) ON DELETE SET NULL,
  title VARCHAR(240) NOT NULL,
  slug VARCHAR(240) NOT NULL,
  story_type VARCHAR(40) NOT NULL DEFAULT 'interactive',
  status VARCHAR(40) NOT NULL DEFAULT 'draft',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CHECK (story_type IN ('static','interactive','continuation')),
  CHECK (status IN ('draft','ready','active','archived'))
);

CREATE UNIQUE INDEX stories_world_slug_unique_active
  ON story.stories(world_id, slug)
  WHERE deleted_at IS NULL;

CREATE TABLE story.story_versions (
  id UUID PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES story.stories(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content_schema_version VARCHAR(40) NOT NULL DEFAULT '1.0',
  content JSONB NOT NULL,
  summary TEXT,
  created_by_model VARCHAR(160),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (story_id, version_number)
);

CREATE TABLE story.story_nodes (
  id UUID PRIMARY KEY,
  story_version_id UUID NOT NULL REFERENCES story.story_versions(id) ON DELETE CASCADE,
  node_key VARCHAR(120) NOT NULL,
  node_type VARCHAR(40) NOT NULL DEFAULT 'narrative',
  sequence_order INTEGER,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (story_version_id, node_key)
);

CREATE TABLE story.story_choices (
  id UUID PRIMARY KEY,
  story_node_id UUID NOT NULL REFERENCES story.story_nodes(id) ON DELETE CASCADE,
  choice_key VARCHAR(120) NOT NULL,
  label VARCHAR(240) NOT NULL,
  target_node_key VARCHAR(120),
  consequence_preview VARCHAR(500),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (story_node_id, choice_key)
);

CREATE TABLE story.story_sessions (
  id UUID PRIMARY KEY,
  story_version_id UUID NOT NULL REFERENCES story.story_versions(id) ON DELETE RESTRICT,
  child_profile_id UUID NOT NULL REFERENCES profile.child_profiles(id) ON DELETE RESTRICT,
  current_location_id UUID REFERENCES world.locations(id) ON DELETE SET NULL,
  current_node_key VARCHAR(120),
  status VARCHAR(40) NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status IN ('active','paused','completed','abandoned'))
);

CREATE TABLE story.story_participants (
  story_session_id UUID NOT NULL REFERENCES story.story_sessions(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES character.characters(id) ON DELETE RESTRICT,
  participation_role VARCHAR(60) NOT NULL DEFAULT 'participant',
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (story_session_id, character_id)
);

CREATE TABLE story.session_decisions (
  id UUID PRIMARY KEY,
  story_session_id UUID NOT NULL REFERENCES story.story_sessions(id) ON DELETE CASCADE,
  node_key VARCHAR(120) NOT NULL,
  choice_key VARCHAR(120) NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  context_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  consequence JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE story.story_outcomes (
  story_session_id UUID PRIMARY KEY REFERENCES story.story_sessions(id) ON DELETE CASCADE,
  outcome_code VARCHAR(100) NOT NULL,
  summary VARCHAR(1000),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE story.story_events (
  id UUID PRIMARY KEY,
  story_session_id UUID NOT NULL REFERENCES story.story_sessions(id) ON DELETE CASCADE,
  event_type VARCHAR(80) NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE education.questions (
  id UUID PRIMARY KEY,
  story_version_id UUID REFERENCES story.story_versions(id) ON DELETE CASCADE,
  question_type VARCHAR(60) NOT NULL,
  prompt VARCHAR(1000) NOT NULL,
  age_band VARCHAR(40),
  expected_answer JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (question_type IN ('comprehension','reflection','emotion','prediction','moral'))
);

CREATE TABLE education.answers (
  id UUID PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES education.questions(id) ON DELETE CASCADE,
  story_session_id UUID NOT NULL REFERENCES story.story_sessions(id) ON DELETE CASCADE,
  child_profile_id UUID NOT NULL REFERENCES profile.child_profiles(id) ON DELETE RESTRICT,
  answer_text VARCHAR(4000),
  answer_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE education.reflections (
  id UUID PRIMARY KEY,
  story_session_id UUID NOT NULL REFERENCES story.story_sessions(id) ON DELETE CASCADE,
  child_profile_id UUID NOT NULL REFERENCES profile.child_profiles(id) ON DELETE RESTRICT,
  reflection_type VARCHAR(60) NOT NULL DEFAULT 'post_story',
  text VARCHAR(4000),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE education.learning_observations (
  id UUID PRIMARY KEY,
  child_profile_id UUID NOT NULL REFERENCES profile.child_profiles(id) ON DELETE CASCADE,
  story_session_id UUID REFERENCES story.story_sessions(id) ON DELETE SET NULL,
  observation_code VARCHAR(100) NOT NULL,
  score REAL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
