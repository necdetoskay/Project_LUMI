import type { QuestRewardState } from "../domain/world-types";

/**
 * Injected boundary for granting inventory items to a child. `@lumi/world`
 * never imports `@lumi/profiles`; the web composition layer implements this
 * port with `@lumi/profiles.acquireItem` (definitionKey + targetOwnerType:
 * "child_profile" + originType "story" → `story_reward` transfer label), and
 * passes an idempotency key so the inventory ledger dedupes re-grants.
 */
export interface InventoryGrantPort {
  grant(input: InventoryGrantInput): Promise<InventoryGrantResult>;
}

export interface InventoryGrantInput {
  householdId: string;
  childProfileId: string;
  reward: QuestRewardState;
  /** Idempotency key (e.g. `quest-reward:<questId>`). */
  idempotencyKey: string;
  /** Quest id for provenance/origin. */
  sourceQuestId: string;
}

export interface InventoryGrantResult {
  granted: boolean;
}
