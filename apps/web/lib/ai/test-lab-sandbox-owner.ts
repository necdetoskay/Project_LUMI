import type { JsonObject, StateSnapshot } from "@lumi/ai/test-lab";

export const TEST_LAB_OWNER_KEY = "__testLabOwner";

export type TestLabSandboxOwner = {
  parentId: string;
  householdId: string;
  childProfileId: string;
};

export function bindSandboxOwner(
  state: JsonObject,
  owner: TestLabSandboxOwner,
): JsonObject {
  return {
    ...state,
    [TEST_LAB_OWNER_KEY]: { ...owner },
  };
}

export function assertSandboxOwner(
  state: StateSnapshot | null,
  expected: TestLabSandboxOwner,
): void {
  const owner = readSandboxOwner(state);
  if (
    owner.parentId !== expected.parentId ||
    owner.householdId !== expected.householdId ||
    owner.childProfileId !== expected.childProfileId
  ) {
    throw new Error("TEST_LAB_FORBIDDEN_SANDBOX");
  }
}

export function readSandboxOwner(
  state: StateSnapshot | null,
): TestLabSandboxOwner {
  if (!state) throw new Error("TEST_LAB_FORBIDDEN_SANDBOX");
  const raw = state.value[TEST_LAB_OWNER_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("TEST_LAB_FORBIDDEN_SANDBOX");
  }
  const parentId = raw.parentId;
  const householdId = raw.householdId;
  const childProfileId = raw.childProfileId;
  if (
    typeof parentId !== "string" ||
    typeof householdId !== "string" ||
    typeof childProfileId !== "string"
  ) {
    throw new Error("TEST_LAB_FORBIDDEN_SANDBOX");
  }
  return { parentId, householdId, childProfileId };
}
