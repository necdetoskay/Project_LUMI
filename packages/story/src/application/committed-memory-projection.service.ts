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
const MEMORY_LIFECYCLES = new Set(["durable", "decaying", "archived"]);

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
  if (evidenceRef && !provenance.includes(evidenceRef)) {
    provenance.push(evidenceRef);
  }

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

async function supersedePriorMemory(
  input: CommitCanonicalMemoriesInput,
  ownerId: string,
  priorMemoryId: string,
): Promise<void> {
  const result = await input.tx.execute(sql`
    UPDATE npc_intelligence.memories
       SET lifecycle = 'superseded',
           archived_at = ${input.createdAt}
     WHERE id = ${priorMemoryId}::uuid
       AND household_id = ${input.householdId}::uuid
       AND world_id = ${input.worldId}::uuid
       AND owner_type = 'npc'
       AND owner_id = ${ownerId}::uuid
       AND child_profile_id IS NOT DISTINCT FROM ${input.childProfileId ?? null}::uuid
       AND lifecycle IN ('durable', 'decaying')
    RETURNING id
  `);

  if (result.length !== 1) {
    throw new Error(
      "MEMORY_SUPERSESSION_SCOPE_MISMATCH: prior memory is missing, inactive or outside the exact household/world/profile/owner scope",
    );
  }
}

/**
 * Projects committed npc_memory_update changes into canonical memory evidence
 * using the caller's transaction. A failed story/world commit therefore leaves
 * no canonical-memory residue, and replay is absorbed by the deterministic
 * household/world/effect unique key.
 *
 * Replacement memories preserve history: the prior row remains stored but is
 * marked superseded, while the new row points back through supersedes_memory_id.
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

    const existingEffect = await input.tx.execute(sql`
      SELECT id
        FROM npc_intelligence.memories
       WHERE household_id = ${input.householdId}::uuid
         AND world_id = ${input.worldId}::uuid
         AND effect_key = ${effectKey}
       LIMIT 1
    `);
    if (existingEffect.length > 0) continue;

    if (memory.supersedesMemoryId) {
      await supersedePriorMemory(
        input,
        change.entityId,
        memory.supersedesMemoryId,
      );
    }

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
        created_at,
        archived_at
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
        ${input.createdAt},
        ${memory.lifecycle === "archived" ? input.createdAt : null}
      )
      ON CONFLICT (household_id, world_id, effect_key) DO NOTHING
    `);
  }
}
