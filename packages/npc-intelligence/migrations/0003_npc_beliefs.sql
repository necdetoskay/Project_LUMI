CREATE SCHEMA IF NOT EXISTS npc_intelligence;

CREATE TABLE IF NOT EXISTS npc_intelligence.beliefs (
  id uuid PRIMARY KEY,
  npc_id uuid NOT NULL,
  household_id uuid NOT NULL,
  fact_id varchar(180) NOT NULL,
  claim varchar(300) NOT NULL,
  confidence numeric(6,5) NOT NULL,
  source varchar(40) NOT NULL,
  provenance jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_verified_at timestamptz,
  expires_at timestamptz,
  status varchar(20) NOT NULL DEFAULT 'active',
  CONSTRAINT npc_beliefs_confidence_check CHECK (confidence >= 0 AND confidence <= 1),
  CONSTRAINT npc_beliefs_status_check CHECK (status IN ('active','stale','expired'))
);

CREATE INDEX IF NOT EXISTS npc_beliefs_npc_household_idx
  ON npc_intelligence.beliefs (npc_id, household_id);
CREATE INDEX IF NOT EXISTS npc_beliefs_fact_idx
  ON npc_intelligence.beliefs (household_id, fact_id);

CREATE UNIQUE INDEX IF NOT EXISTS npc_beliefs_active_fact_unique
  ON npc_intelligence.beliefs (household_id, npc_id, fact_id)
  WHERE status = 'active';
