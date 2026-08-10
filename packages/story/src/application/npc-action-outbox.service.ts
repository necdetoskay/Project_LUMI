import { sql } from "drizzle-orm";

import { DrizzleStoryRepository } from "../db/repositories/drizzle/drizzle-story.repository";
import type { Database } from "../db/client";
import { getStoryDb } from "./db";

let testDb: Database | undefined;

export function __setTestNpcActionOutboxDb(db: Database | undefined): void {
  testDb = db;
}

function getDb(): Database {
  return testDb ?? getStoryDb();
}

interface EnqueueNpcActionBaseInput {
  householdId: string;
  worldId: string;
  childProfileId: string;
  npcId: string;
  characterId: string;
  decisionEvidenceId: string;
  decisionKey: string;
  selectedCandidateId: string;
}

export interface EnqueueNpcActionMoveInput extends EnqueueNpcActionBaseInput {
  targetLocationId: string;
}

export interface EnqueueNpcActionRelationshipInput
  extends EnqueueNpcActionBaseInput {
  relationshipToCharacter: number;
}

export interface EnqueueNpcActionResult {
  outcome: "enqueued" | "duplicate";
  outboxId: string;
}

async function enqueueNpcActionIntent(
  input: EnqueueNpcActionBaseInput,
  intentType: "npc_action_move_character" | "npc_action_set_relationship",
  effectPayload: Record<string, unknown>,
): Promise<EnqueueNpcActionResult> {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  const idempotencyKey = `npc-action:${input.decisionEvidenceId}:${input.selectedCandidateId}`;
  const lockKey = `${input.householdId}:${idempotencyKey}`;

  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`);
    const existing = await repo.findOutboxByIdempotencyKey(
      tx,
      input.householdId,
      idempotencyKey,
    );
    if (existing) {
      return { outcome: "duplicate" as const, outboxId: existing.id };
    }

    const id = crypto.randomUUID();
    await repo.enqueueOutbox(tx, {
      id,
      householdId: input.householdId,
      worldId: input.worldId,
      storySessionId: null,
      commitId: input.decisionEvidenceId,
      idempotencyKey,
      intentType,
      payload: {
        householdId: input.householdId,
        worldId: input.worldId,
        childProfileId: input.childProfileId,
        npcId: input.npcId,
        characterId: input.characterId,
        decisionEvidenceId: input.decisionEvidenceId,
        decisionKey: input.decisionKey,
        selectedCandidateId: input.selectedCandidateId,
        ...effectPayload,
      },
      evidenceRef: `npc-decision://${input.decisionEvidenceId}`,
      status: "pending",
      attemptCount: "0",
      lastError: null,
      appliedAt: null,
      createdAt: new Date(),
    });
    return { outcome: "enqueued" as const, outboxId: id };
  });
}

export async function enqueueNpcActionMoveIntent(
  input: EnqueueNpcActionMoveInput,
): Promise<EnqueueNpcActionResult> {
  return enqueueNpcActionIntent(input, "npc_action_move_character", {
    targetLocationId: input.targetLocationId,
  });
}

export async function enqueueNpcActionRelationshipIntent(
  input: EnqueueNpcActionRelationshipInput,
): Promise<EnqueueNpcActionResult> {
  if (
    !Number.isFinite(input.relationshipToCharacter) ||
    input.relationshipToCharacter < -1 ||
    input.relationshipToCharacter > 1
  ) {
    throw new Error("NPC_RELATIONSHIP_OUT_OF_RANGE");
  }
  return enqueueNpcActionIntent(input, "npc_action_set_relationship", {
    relationshipToCharacter: input.relationshipToCharacter,
  });
}
