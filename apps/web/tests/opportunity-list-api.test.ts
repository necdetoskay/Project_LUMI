import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetOwnedHousehold = vi.fn();
const mockListProposed = vi.fn();

vi.mock("@lumi/profiles/application", () => ({
  getOwnedHousehold: (...args: unknown[]) => mockGetOwnedHousehold(...args),
}));

vi.mock("@lumi/npc-intelligence/application", () => ({
  OpportunityDeliveryService: class {
    listProposedForChild = mockListProposed;
  },
}));

vi.mock("@lumi/npc-intelligence/db", () => ({
  DrizzleOpportunityInboxRepository: class {
    constructor() {}
  },
  getNpcDb: () => ({}),
}));

vi.mock("@/lib/auth/with-parent", () => ({
  withParent: (fn: (parent: { id: string }) => Promise<Response>) =>
    fn({ id: "parent-user-id" }),
}));

type GetRoute = (request: Request) => Promise<Response>;

const HOUSEHOLD_ID = "11111111-1111-4111-8111-111111111111";
const CHILD_ID = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("interaction opportunities list route", () => {
  it("lists proposed opportunities for a child", async () => {
    mockGetOwnedHousehold.mockResolvedValueOnce({ id: HOUSEHOLD_ID });
    mockListProposed.mockResolvedValueOnce([
      {
        getState: () => ({
          id: "opp-1",
          householdId: HOUSEHOLD_ID,
          sourceNpcId: "npc-1",
          childProfileId: CHILD_ID,
          opportunityType: "rumor",
          message: "I heard something.",
          evidence: { claim: "moon is made of cheese" },
          score: 0.8,
          cooldownKeys: [],
          expiresAt: new Date("2026-08-08T00:00:00Z"),
          status: "proposed",
          respondedAt: null,
          reason: "test",
          createdAt: new Date(),
        }),
      },
    ]);

    const route = (await import(
      "@/app/api/interactions/opportunities/route"
    )) as { GET: GetRoute };
    const response = await route.GET(
      new Request(
        `http://localhost/api/interactions/opportunities?householdId=${HOUSEHOLD_ID}&childProfileId=${CHILD_ID}`,
      ),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.opportunities).toHaveLength(1);
    expect(body.opportunities[0].type).toBe("rumor");
    expect(mockListProposed).toHaveBeenCalledWith(HOUSEHOLD_ID, CHILD_ID);
  });

  it("rejects a mismatched household", async () => {
    mockGetOwnedHousehold.mockResolvedValueOnce({ id: "other-household" });

    const route = (await import(
      "@/app/api/interactions/opportunities/route"
    )) as { GET: GetRoute };
    const response = await route.GET(
      new Request(
        `http://localhost/api/interactions/opportunities?householdId=${HOUSEHOLD_ID}&childProfileId=${CHILD_ID}`,
      ),
    );

    expect(response.status).toBe(403);
    expect(mockListProposed).not.toHaveBeenCalled();
  });

  it("returns 400 when query params are missing", async () => {
    const route = (await import(
      "@/app/api/interactions/opportunities/route"
    )) as { GET: GetRoute };
    const response = await route.GET(
      new Request("http://localhost/api/interactions/opportunities"),
    );

    expect(response.status).toBe(400);
  });
});
