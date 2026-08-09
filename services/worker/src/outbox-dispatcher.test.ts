import { describe, expect, it } from "vitest";

import { WorkerOutboxDispatcher } from "./outbox-dispatcher";

describe("WorkerOutboxDispatcher", () => {
  it("fails closed for unknown intent types", async () => {
    const dispatcher = new WorkerOutboxDispatcher();

    await expect(
      dispatcher.apply({ intentType: "unknown_intent", payload: {} }),
    ).rejects.toThrow("OUTBOX_INTENT_NOT_CONFIGURED:unknown_intent");
  });
});
