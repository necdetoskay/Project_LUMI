import { describe, expect, it } from "vitest";

import type { StateSnapshot } from "@lumi/ai/test-lab";
import {
  assertSandboxOwner,
  bindSandboxOwner,
  readSandboxOwner,
} from "../lib/ai/test-lab-sandbox-owner";

const owner = {
  parentId: "parent-a",
  householdId: "household-a",
  childProfileId: "child-a",
};

function snapshot(value: StateSnapshot["value"]): StateSnapshot {
  return {
    id: "state-1",
    sessionId: "session-1",
    branchId: "branch-1",
    parentStateId: null,
    createdByRunId: null,
    value,
    createdAt: "2026-08-18T10:20:00.000Z",
  };
}

describe("Test Lab sandbox ownership", () => {
  it("overrides user supplied ownership metadata when binding a session", () => {
    const state = bindSandboxOwner(
      {
        characterType: { key: "fantastic" },
        __testLabOwner: {
          parentId: "attacker",
          householdId: "other",
          childProfileId: "other",
        },
      },
      owner,
    );

    expect(readSandboxOwner(snapshot(state))).toEqual(owner);
  });

  it("accepts the owner that created the sandbox", () => {
    const state = snapshot(bindSandboxOwner({}, owner));
    expect(() => assertSandboxOwner(state, owner)).not.toThrow();
  });

  it("rejects another authenticated parent even when the sandbox id is known", () => {
    const state = snapshot(bindSandboxOwner({}, owner));
    expect(() =>
      assertSandboxOwner(state, { ...owner, parentId: "parent-b" }),
    ).toThrow("TEST_LAB_FORBIDDEN_SANDBOX");
  });

  it("rejects household or child-profile context changes inside a session", () => {
    const state = snapshot(bindSandboxOwner({}, owner));
    expect(() =>
      assertSandboxOwner(state, { ...owner, householdId: "household-b" }),
    ).toThrow("TEST_LAB_FORBIDDEN_SANDBOX");
    expect(() =>
      assertSandboxOwner(state, { ...owner, childProfileId: "child-b" }),
    ).toThrow("TEST_LAB_FORBIDDEN_SANDBOX");
  });
});
