import { DrizzleStoryRepository } from "../db/repositories/drizzle/drizzle-story.repository";
import { getStoryDb } from "./db";
import type { Database } from "../db/client";

let testDb: Database | undefined;

export function __setTestQuestRewardOutboxDb(db: Database | undefined): void {
  testDb = db;
}

function getDb(): Database {
  return testDb ?? getStoryDb();
}

export interface EnqueueQuestRewardInput {
  householdId: string;
  worldId: string;
  questId: string;
  storySessionId: string | null;
  childProfileId: string;
  reward: { itemDefinitionKey: string; quantity: number };
  evidenceRef: string;
}

/**
 * Enqueues a `quest_reward_grant` outbox intent (S33). Called by the story
 * composition layer when the world-side `applyQuestChange` reports
 * `questCompleted` with an authored reward. Story never imports world; the
 * intent payload is plain JSON and the world-side `QuestRewardApplicator`
 * (composed externally) performs the actual inventory grant.
 */
export async function enqueueQuestRewardIntent(
  input: EnqueueQuestRewardInput,
): Promise<void> {
  const repo = new DrizzleStoryRepository();
  await repo.enqueueOutbox(getDb(), {
    id: crypto.randomUUID(),
    householdId: input.householdId,
    worldId: input.worldId,
    commitId: input.questId,
    idempotencyKey: `quest-reward:${input.questId}`,
    intentType: "quest_reward_grant",
    payload: {
      questId: input.questId,
      householdId: input.householdId,
      worldId: input.worldId,
      storySessionId: input.storySessionId,
      childProfileId: input.childProfileId,
      reward: input.reward,
      evidenceRef: input.evidenceRef,
    },
    evidenceRef: input.evidenceRef,
    status: "pending",
    attemptCount: "0",
    lastError: null,
    appliedAt: null,
    createdAt: new Date(),
  });
}
