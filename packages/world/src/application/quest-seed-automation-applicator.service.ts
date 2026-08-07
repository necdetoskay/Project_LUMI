import { instantiateQuestFromSeed } from "./quest-seed-automation.service";
import type { QuestState } from "../domain/world-types";

export interface QuestSeedAutomationIntentPayload {
  hookId?: unknown;
  opportunityId?: unknown;
  storySessionId?: unknown;
  worldId?: unknown;
  householdId?: unknown;
  factId?: unknown;
  sourceNpcId?: unknown;
}

export type QuestSeedAutomationApplicatorResult =
  | { outcome: "applied"; quest: QuestState }
  | { outcome: "skipped"; reason: string };

/**
 * World-side applicator for the `quest_seed_automation` outbox intent (S31).
 *
 * Story enqueues the intent (plain JSON payload) without importing world; this
 * applicator is composed externally (web/worker) into the story propagator.
 * It validates the intent payload and delegates to
 * `instantiateQuestFromSeed`, which is idempotent per `sourceHookId`.
 * It performs no writes itself when the intent is invalid or empty.
 */
export class QuestSeedAutomationApplicator {
  private readonly automate: typeof instantiateQuestFromSeed;

  constructor(
    automate: typeof instantiateQuestFromSeed = instantiateQuestFromSeed,
  ) {
    this.automate = automate;
  }

  async apply(intent: {
    intentType?: string;
    payload?: unknown;
  }): Promise<QuestSeedAutomationApplicatorResult> {
    if (intent.intentType !== "quest_seed_automation") {
      return { outcome: "skipped", reason: "unexpected intent type" };
    }

    const payload = (intent.payload ?? {}) as QuestSeedAutomationIntentPayload;

    const householdId = String(payload.householdId ?? "");
    const worldId = String(payload.worldId ?? "");
    const storySessionId = String(payload.storySessionId ?? "");
    const factId = String(payload.factId ?? "");
    const sourceHookId = String(payload.hookId ?? "");

    if (!householdId || !worldId || !storySessionId || !sourceHookId) {
      return {
        outcome: "skipped",
        reason: "incomplete quest_seed automation payload",
      };
    }

    const result = await this.automate({
      householdId,
      worldId,
      storySessionId,
      factId,
      sourceHookId,
    });

    return { outcome: "applied", quest: result.quest };
  }
}
