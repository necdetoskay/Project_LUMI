import { validateReward } from "../domain/validation";
import type { InventoryGrantPort } from "./inventory-grant.port";
import type { QuestRewardState } from "../domain/world-types";

export interface QuestRewardIntentPayload {
  questId?: unknown;
  householdId?: unknown;
  worldId?: unknown;
  storySessionId?: unknown;
  childProfileId?: unknown;
  reward?: unknown;
  evidenceRef?: unknown;
}

export type QuestRewardApplicatorResult =
  | { outcome: "granted"; granted: boolean }
  | { outcome: "skipped"; reason: string };

/**
 * World-side applicator for the `quest_reward_grant` outbox intent (S33).
 *
 * Story enqueues the intent (plain-JSON payload) when a quest auto-completes;
 * this applicator validates the intent + reward payload and delegates the grant
 * through the injected `InventoryGrantPort` (idempotent per
 * `quest-reward:<questId>`). It performs no writes itself for invalid intents
 * and never imports `@lumi/profiles`.
 */
export class QuestRewardApplicator {
  constructor(private readonly grantPort: InventoryGrantPort) {}

  async apply(intent: {
    intentType?: string;
    payload?: unknown;
  }): Promise<QuestRewardApplicatorResult> {
    if (intent.intentType !== "quest_reward_grant") {
      return { outcome: "skipped", reason: "unexpected intent type" };
    }

    const payload = (intent.payload ?? {}) as QuestRewardIntentPayload;

    const questId = String(payload.questId ?? "");
    const householdId = String(payload.householdId ?? "");
    const childProfileId = String(payload.childProfileId ?? "");

    if (!questId || !householdId || !childProfileId) {
      return {
        outcome: "skipped",
        reason: "incomplete quest_reward_grant payload",
      };
    }

    const reward = payload.reward as QuestRewardState | null | undefined;
    if (!reward) {
      return { outcome: "skipped", reason: "no reward defined on quest" };
    }

    let validated: QuestRewardState;
    try {
      validated = validateReward({
        itemDefinitionKey: reward.itemDefinitionKey,
        quantity: reward.quantity,
      });
    } catch {
      return { outcome: "skipped", reason: "invalid reward definition" };
    }

    const result = await this.grantPort.grant({
      householdId,
      childProfileId,
      reward: validated,
      idempotencyKey: `quest-reward:${questId}`,
      sourceQuestId: questId,
    });

    return { outcome: "granted", granted: result.granted };
  }
}
