import { and, eq } from "drizzle-orm";

import { storyHooks } from "../db/schema/story";
import type { StoryHookState } from "../domain/story-types";
import { NotFoundError, ValidationError } from "../domain/errors";
import { getStoryDb } from "./db";

export interface StoryHookConsumptionScope {
  hookId: string;
  sessionId: string;
  householdId: string;
  childProfileId: string;
}

export async function getStoryHookForConsumption(
  scope: StoryHookConsumptionScope,
): Promise<StoryHookState> {
  const db = getStoryDb();
  const [row] = await db
    .select()
    .from(storyHooks)
    .where(
      and(
        eq(storyHooks.id, scope.hookId),
        eq(storyHooks.storySessionId, scope.sessionId),
        eq(storyHooks.householdId, scope.householdId),
        eq(storyHooks.childProfileId, scope.childProfileId),
      ),
    )
    .limit(1);

  if (!row) {
    throw new NotFoundError("StoryHook", scope.hookId);
  }
  if (row.status !== "pending" && row.status !== "consumed") {
    throw new ValidationError(
      "HOOK_NOT_CONSUMABLE",
      `Story hook cannot be consumed from status '${row.status}'`,
    );
  }

  return row as unknown as StoryHookState;
}

export async function markStoryHookConsumed(
  scope: StoryHookConsumptionScope,
): Promise<void> {
  const db = getStoryDb();
  await db
    .update(storyHooks)
    .set({
      status: "consumed",
      consumedAt: new Date(),
      version: 2,
    })
    .where(
      and(
        eq(storyHooks.id, scope.hookId),
        eq(storyHooks.storySessionId, scope.sessionId),
        eq(storyHooks.householdId, scope.householdId),
        eq(storyHooks.childProfileId, scope.childProfileId),
      ),
    );
}
