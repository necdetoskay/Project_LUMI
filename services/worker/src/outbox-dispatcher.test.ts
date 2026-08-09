import { describe, expect, it } from "vitest";

import { WorkerOutboxDispatcher } from "./outbox-dispatcher";

describe("WorkerOutboxDispatcher", () => {
  it("fails closed for unknown intent types", async () => {
    const dispatcher = new WorkerOutboxDispatcher();

    await expect(
      dispatcher.apply({ intentType: "unknown_intent", payload: {} }),
    ).rejects.toThrow("OUTBOX_INTENT_NOT_CONFIGURED:unknown_intent");
  });

  it("fails closed for incomplete quest reward payloads", async () => {
    const dispatcher = new WorkerOutboxDispatcher();

    await expect(
      dispatcher.apply({ intentType: "quest_reward_grant", payload: {} }),
    ).rejects.toThrow(
      "QUEST_REWARD_NOT_APPLIED:incomplete quest_reward_grant payload",
    );
  });
});
