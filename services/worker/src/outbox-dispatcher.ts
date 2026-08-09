import { QuestSeedAutomationApplicator } from "@lumi/world/application";

export interface WorkerOutboxIntent {
  intentType?: string;
  payload?: unknown;
}

export class WorkerOutboxDispatcher {
  private readonly questSeed = new QuestSeedAutomationApplicator();

  async apply(intent: WorkerOutboxIntent): Promise<{ writes: number }> {
    switch (intent.intentType) {
      case "quest_seed_automation": {
        const result = await this.questSeed.apply(intent);
        if (result.outcome !== "applied") {
          throw new Error(`QUEST_SEED_NOT_APPLIED:${result.reason}`);
        }
        return { writes: 1 };
      }
      default:
        throw new Error(
          `OUTBOX_INTENT_NOT_CONFIGURED:${String(intent.intentType ?? "unknown")}`,
        );
    }
  }
}
