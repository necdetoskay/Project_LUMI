CREATE TABLE IF NOT EXISTS "npc_intelligence"."worker_npc_decisions" (
  "id" uuid PRIMARY KEY NOT NULL,
  "household_id" uuid NOT NULL,
  "world_id" uuid NOT NULL,
  "child_profile_id" uuid NOT NULL,
  "npc_id" uuid NOT NULL,
  "decision_key" varchar(128) NOT NULL,
  "selected_candidate_id" varchar(255),
  "used_memory_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "result_json" jsonb NOT NULL,
  "decided_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "worker_npc_decisions_scope_key_uidx"
ON "npc_intelligence"."worker_npc_decisions" USING btree
("household_id", "world_id", "child_profile_id", "npc_id", "decision_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "worker_npc_decisions_scope_idx"
ON "npc_intelligence"."worker_npc_decisions" USING btree
("household_id", "world_id", "child_profile_id", "npc_id", "decided_at");
