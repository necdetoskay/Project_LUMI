import { sql } from "drizzle-orm";

import type { QueryExecutor } from "../db/client";
import type { WorldChange } from "../domain/outcome/world-commit-rule-engine";

const MEMORY_KINDS = new Set([
  "experience",
  "knowledge",
  "emotion",
  "promise",
  "discovery",
  "change",
]);
const MEMORY_LIFECYCLES = new Set([
  "durable",
  "decaying",
  "superseded",
  "archived",
]);

export interface CommitCanonicalMemoriesInput {
  tx: QueryExecutor;
  householdId: string;
  worldId: string;
  childProfileId?: string | null;
  storySessionId: string;
  outcomeId: string;
  commitId: string;
  changes: WorldChange[];
  createdAt: Date;
}

interface ParsedMemoryValue {
  summary: string;
  kind: string;
  salience: number;
  confidence: number;
  lifecycle: string;
  provenance: string[];
  supersedesMemoryId: string | null;
}

function clamp01(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : fallback;
}

function parseMemoryValue(
  value: unknown,
  evidenceRef: string,
): ParsedMemoryValue {
  if (typeof value === "string" && value.trim()) {
    return {
      summary: value.trim().slice(0, 500),
      kind: "knowledge",
      salience: 0.7,
      confidence: 0.9,
      lifecycle: "durable",
      provenance: [evidenceRef].filter(Boolean),
      supersedesMemoryId: null,
    };
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(
      "MEMORY_PROJECTION_INVALID_VALUE: npc memory requires text or structured value",
    );
  }

  const record = value as Record<string, unknown>;
  const summary =
    typeof record.summary === "string" ? record.summary.trim() : "";
  if (!summary) {
    throw new Error(
      "MEMORY_PROJECTION_MISSING_SUMMARY: npc memory summary is required",
    );
  }

  const kind =
    typeof record.kind === "string" && MEMORY_KINDS.has(record.kind)
      ? record.kind
      : "knowledge";
  const lifecycle =
    typeof record.lifecycle === "string" &&
    MEMORY_LIFECYCLES.has(record.lifecycle)
      ? record.lifecycle
      : "durable";
  const provenance = Array.isArray(record.provenance)
    ? record.provenance
        .filter(
          (entry): entry is string =>
            typeof entry === "string" && entry.trim().length > 0,
        )
        .slice(0, 19)
    : [];
  if (evidenceRef && !provenance.includes(evidenceRef))
    provenance.push(evidenceRef);

  return {
    summary: summary.slice(0, 500),
    kind,
    salience: clamp01(record.salience, 0.7),
    confidence: clamp01(record.confidence, 0.9),
    lifecycle,
    provenance,
    supersedesMemoryId:
      typeof record.supersedesMemoryId === "string" && record.supersedesMemoryId
        ? record.supersedesMemoryId
        : null,
  };
}

/**
 * Projects committed npc_memory_update changes into canonical memory evidence
 * using the caller's transaction. A failed story/world commit therefore leaves
 * no canonical-memory residue, and replay is absorbed by the deterministic
 * household/world/effect unique key.
 */
export async function commitCanonicalMemories(
  input: CommitCanonicalMemoriesInput,
): Promise<void> {
  const memoryChanges = input.changes.filter(
    (change) =>
      change.ruleId === "default-npc-memory" && change.status === "committed",
  );

  for (const change of memoryChanges) {
    const memory = parseMemoryValue(change.value, change.evidenceRef);
    const effectKey = `story-memory:${input.outcomeId}:${change.changeKey}`;

    await input.tx.execute(sql`
      INSERT INTO npc_intelligence.memories (
        id,
        household_id,
        world_id,
        child_profile_id,
        owner_type,
        owner_id,
        kind,
        summary,
        salience,
        confidence,
        source_type,
        source_id,
        story_session_id,
        outcome_id,
        effect_key,
        provenance,
        lifecycle,
        supersedes_memory_id,
        created_at
      ) VALUES (
        ${crypto.randomUUID()}::uuid,
        ${input.householdId}::uuid,
        ${input.worldId}::uuid,
        ${input.childProfileId ?? null}::uuid,
        'npc',
        ${change.entityId}::uuid,
        ${memory.kind},
        ${memory.summary},
        ${memory.salience},
        ${memory.confidence},
        'story_outcome',
        ${input.commitId},
        ${input.storySessionId}::uuid,
        ${input.outcomeId},
        ${effectKey},
        ${JSON.stringify(memory.provenance)}::jsonb,
        ${memory.lifecycle},
        ${memory.supersedesMemoryId}::uuid,
        ${input.createdAt}
      )
      ON CONFLICT (household_id, world_id, effect_key) DO NOTHING
    `);
  }
}
