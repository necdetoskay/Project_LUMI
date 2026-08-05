import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateOrReplaceFirstRunHandoff = vi.fn();

vi.mock("@lumi/profiles/application", () => ({
  createOrReplaceFirstRunHandoff: (...args: unknown[]) =>
    mockCreateOrReplaceFirstRunHandoff(...args),
}));

vi.mock("@/lib/auth/with-parent", () => ({
  withParent: (fn: (parent: { id: string }) => Promise<Response>) =>
    fn({ id: "parent-user-id" }),
}));

describe("character bootstrap handoff route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a domain validation error instead of generic 500", async () => {
    mockCreateOrReplaceFirstRunHandoff.mockRejectedValueOnce(
      Object.assign(new Error("Veritabani arketip kaydi gecersiz"), {
        name: "DomainError",
        code: "INVALID_ARCHETYPE_DATA",
      }),
    );

    const route = await import("@/app/api/character-bootstrap/handoff/route");
    const response = await route.POST(
      new Request("http://localhost/api/character-bootstrap/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdId: "11111111-1111-4111-8111-111111111111",
          childProfileId: "22222222-2222-4222-8222-222222222222",
          characterType: "explorer",
          originMode: "auto",
          archetypeBatchId: "33333333-3333-4333-8333-333333333333",
          archetypeId: "44444444-4444-4444-8444-444444444444",
        }),
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("INVALID_ARCHETYPE_DATA");
  });
});
