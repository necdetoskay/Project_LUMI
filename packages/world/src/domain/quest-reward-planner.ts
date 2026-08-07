import type { QuestState, QuestRewardState } from "./world-types";

export interface QuestRewardIntent {
  questId: string;
  householdId: string;
  worldId: string;
  storySessionId: string | null;
  reward: QuestRewardState;
}

/**
 * Deterministically plans a quest reward. A reward is granted exactly once,
 * when the quest transitions to `completed` and an authored reward is defined
 * on the quest instance (propagated from its template at instantiation).
 * Returns `null` for every other state — no reward, no side effect.
 */
export function planQuestReward(quest: QuestState): QuestRewardIntent | null {
  if (quest.status !== "completed") return null;
  if (!quest.reward) return null;

  return {
    questId: quest.id,
    householdId: quest.householdId,
    worldId: quest.worldId,
    storySessionId: quest.storySessionId,
    reward: { ...quest.reward },
  };
}
