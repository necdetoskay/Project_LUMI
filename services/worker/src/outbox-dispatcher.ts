import {
  QuestRewardApplicator,
  QuestSeedAutomationApplicator,
} from "@lumi/world/application";

import { ProfileInventoryGrantAdapter } from "./profile-inventory-grant.adapter";

export interface WorkerOutboxIntent {
  intentType?: string;
  payload?: unknown;
}

export class WorkerOutboxDispatcher {
  private readonly questSeed = new QuestSeedAutomationApplicator();
  private readonly questReward = new QuestRewardApplicator(
    new ProfileInventoryGrantAdapter(),
  );

  async apply(intent: WorkerOutboxIntent): Promise<{ writes: number }> {
    switch (intent.intentType) {
      case "quest_seed_automation": {
        const result = await this.questSeed.apply(intent);
        if (result.outcome !== "applied") {
          throw new Error(`QUEST_SEED_NOT_APPLIED:${result.reason}`);
        }
        return { writes: 1 };
      }
      case "quest_reward_grant": {
        const result = await this.questReward.apply(intent);
        if (result.outcome !== "granted") {
          throw new Error(`QUEST_REWARD_NOT_APPLIED:${result.reason}`);
        }
        return { writes: result.granted ? 1 : 0 };
      }
      default:
        throw new Error(
          `OUTBOX_INTENT_NOT_CONFIGURED:${String(intent.intentType ?? "unknown")}`,
        );
    }
  }
}
