import { describe, expect, it, vi } from "vitest";

const mockAbandonCharacterCreationCycle = vi.fn();

vi.mock("@lumi/profiles/application", () => ({
  abandonCharacterCreationCycle: (...args: unknown[]) =>
    mockAbandonCharacterCreationCycle(...args),
  getActiveCharacterCreationCycle: vi.fn(),
  chooseCharacterCreationDirection: vi.fn(),
  chooseCharacterIdentity: vi.fn(),
  ensureDefaultLlmTaskSettings: vi.fn(),
}));

vi.mock("@/lib/auth/with-parent", () => ({
  withParent: (fn: (parent: { id: string }) => Promise<Response>) =>
    fn({ id: "parent-user-id" }),
}));

import { POST } from "@/app/api/character-creation/canonical/route";

const HOUSEHOLD_ID = "11111111-1111-1111-1111-111111111111";
const CHILD_PROFILE_ID = "22222222-2222-2222-2222-222222222222";

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/character-creation/canonical", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Character creation abandon API", () => {
  it("returns 400 when householdId/childProfileId are missing", async () => {
    const res = await POST(makeRequest({ action: "abandon" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("marks the active draft cycle as abandoned", async () => {
    mockAbandonCharacterCreationCycle.mockResolvedValueOnce({
      cycleId: "cycle-1",
      status: "abandoned",
    });

    const res = await POST(
      makeRequest({
        action: "abandon",
        householdId: HOUSEHOLD_ID,
        childProfileId: CHILD_PROFILE_ID,
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.abandoned).toEqual({
      cycleId: "cycle-1",
      status: "abandoned",
    });
    expect(mockAbandonCharacterCreationCycle).toHaveBeenCalledWith(
      "parent-user-id",
      HOUSEHOLD_ID,
      CHILD_PROFILE_ID,
    );
  });

  it("returns onboarding error when no active cycle exists", async () => {
    mockAbandonCharacterCreationCycle.mockRejectedValueOnce(
      new Error("CHARACTER_CREATION_CYCLE_REQUIRED"),
    );

    const res = await POST(
      makeRequest({
        action: "abandon",
        householdId: HOUSEHOLD_ID,
        childProfileId: CHILD_PROFILE_ID,
      }),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("ONBOARDING_ERROR");
  });

  it("returns 403 for cross-family access", async () => {
    const { AuthorizationError } = await import("@lumi/profiles/domain");
    mockAbandonCharacterCreationCycle.mockRejectedValueOnce(
      new AuthorizationError("User is not a member of this household"),
    );

    const res = await POST(
      makeRequest({
        action: "abandon",
        householdId: HOUSEHOLD_ID,
        childProfileId: CHILD_PROFILE_ID,
      }),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("FORBIDDEN");
  });
});
