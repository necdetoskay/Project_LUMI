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

export interface EnqueueNpcActionMoveInput {
  householdId: string;
  worldId: string;
  childProfileId: string;
  npcId: string;
  characterId: string;
  decisionEvidenceId: string;
  decisionKey: string;
  selectedCandidateId: string;
  targetLocationId: string;
}

export interface EnqueueNpcActionResult {
  outcome: "enqueued" | "duplicate";
  outboxId: string;
}

export async function enqueueNpcActionMoveIntent(
  input: EnqueueNpcActionMoveInput,
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
      intentType: "npc_action_move_character",
      payload: {
        householdId: input.householdId,
        worldId: input.worldId,
        childProfileId: input.childProfileId,
        npcId: input.npcId,
        characterId: input.characterId,
        decisionEvidenceId: input.decisionEvidenceId,
        decisionKey: input.decisionKey,
        selectedCandidateId: input.selectedCandidateId,
        targetLocationId: input.targetLocationId,
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
