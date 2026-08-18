import { describe, expect, it } from "vitest";

import { createStateDiff } from "../src/test-lab/domain/state-diff";

describe("createStateDiff", () => {
  it("separates added, removed and changed top-level state keys", () => {
    const diff = createStateDiff({
      fromStateId: "state-before",
      toStateId: "state-after",
      before: {
        world: { region: "cave" },
        inventory: ["map"],
        obsolete: true,
      },
      after: {
        world: { region: "lake" },
        inventory: ["map"],
        npc: { mira: "friend" },
      },
    });

    expect(diff).toEqual({
      fromStateId: "state-before",
      toStateId: "state-after",
      addedKeys: ["npc"],
      removedKeys: ["obsolete"],
      changedKeys: ["world"],
    });
  });
});
