import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetOwnedHousehold = vi.fn();
const mockFindChildProfileForUser = vi.fn();
const mockListCharactersByChildProfile = vi.fn();
const mockGetWorldForCharacter = vi.fn();
const mockGetActiveSessionForChildAndWorld = vi.fn();
const mockCreateHook = vi.fn();
const mockFindOpportunityById = vi.fn();
const mockRespond = vi.fn();

vi.mock("@lumi/profiles/application", () => ({
  getOwnedHousehold: (...args: unknown[]) => mockGetOwnedHousehold(...args),
  findChildProfileForUser: (...args: unknown[]) =>
    mockFindChildProfileForUser(...args),
  listCharactersByChildProfile: (...args: unknown[]) =>
    mockListCharactersByChildProfile(...args),
}));

vi.mock("@lumi/world/application", () => ({
  getWorldForCharacter: (...args: unknown[]) =>
    mockGetWorldForCharacter(...args),
}));

vi.mock("@lumi/story/application", () => ({
  getActiveSessionForChildAndWorld: (...args: unknown[]) =>
    mockGetActiveSessionForChildAndWorld(...args),
  StoryHookService: class {
    createHook = mockCreateHook;
  },
}));

vi.mock("@lumi/npc-intelligence/application", () => ({
  OpportunityDeliveryService: class {
    respond = mockRespond;
  },
}));

vi.mock("@lumi/npc-intelligence/db", () => ({
  DrizzleOpportunityInboxRepository: class {
    constructor() {}
    findById = mockFindOpportunityById;
  },
  getNpcDb: () => ({}),
}));

vi.mock("@/lib/auth/with-parent", () => ({
  withParent: (fn: (parent: { id: string }) => Promise<Response>) =>
    fn({ id: "parent-user-id" }),
}));

type Route = (
  request: Request,
  ctx: { params: Promise<Record<string, string>> },
) => Promise<Response>;

const HOUSEHOLD_ID = "11111111-1111-4111-8111-111111111111";
const CHILD_ID = "22222222-2222-4222-8222-222222222222";
const OPPORTUNITY_ID = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("interaction opportunity respond route", () => {
  it("declines without creating a hook", async () => {
    mockGetOwnedHousehold.mockResolvedValueOnce({ id: HOUSEHOLD_ID });
    mockFindChildProfileForUser.mockResolvedValueOnce({
      id: CHILD_ID,
      displayName: "Lumi",
      ageBand: "6-8",
    });

    const route = (await import(
      "@/app/api/interactions/opportunities/[opportunityId]/respond/route"
    )) as { POST: Route };
    const response = await route.POST(
      new Request(
        `http://localhost/api/interactions/opportunities/${OPPORTUNITY_ID}/respond`,
        {
          method: "POST",
          body: JSON.stringify({
            householdId: HOUSEHOLD_ID,
            childProfileId: CHILD_ID,
            response: "declined",
          }),
        },
      ),
      { params: Promise.resolve({ opportunityId: OPPORTUNITY_ID }) },
    );

    expect(response.status).toBe(200);
  });

  it("rejects a mismatched household", async () => {
    mockGetOwnedHousehold.mockResolvedValueOnce({ id: "other-household" });

    const route = (await import(
      "@/app/api/interactions/opportunities/[opportunityId]/respond/route"
    )) as { POST: Route };
    const response = await route.POST(
      new Request(
        `http://localhost/api/interactions/opportunities/${OPPORTUNITY_ID}/respond`,
        {
          method: "POST",
          body: JSON.stringify({
            householdId: HOUSEHOLD_ID,
            childProfileId: CHILD_ID,
            response: "accepted",
          }),
        },
      ),
      { params: Promise.resolve({ opportunityId: OPPORTUNITY_ID }) },
    );

    expect(response.status).toBe(403);
  });

  it("returns 400 when response is invalid", async () => {
    mockGetOwnedHousehold.mockResolvedValueOnce({ id: HOUSEHOLD_ID });

    const route = (await import(
      "@/app/api/interactions/opportunities/[opportunityId]/respond/route"
    )) as { POST: Route };
    const response = await route.POST(
      new Request(
        `http://localhost/api/interactions/opportunities/${OPPORTUNITY_ID}/respond`,
        {
          method: "POST",
          body: JSON.stringify({
            householdId: HOUSEHOLD_ID,
            childProfileId: CHILD_ID,
            response: "maybe",
          }),
        },
      ),
      { params: Promise.resolve({ opportunityId: OPPORTUNITY_ID }) },
    );

    expect(response.status).toBe(400);
  });

  it("accepts and creates a hook with resolved world + session", async () => {
    mockGetOwnedHousehold.mockResolvedValueOnce({ id: HOUSEHOLD_ID });
    mockFindChildProfileForUser.mockResolvedValueOnce({ id: CHILD_ID });
    mockRespond.mockResolvedValueOnce(undefined);
    mockListCharactersByChildProfile.mockResolvedValueOnce([
      { id: "character-1", name: "Lumi" },
    ]);
    mockGetWorldForCharacter.mockResolvedValueOnce({ id: "world-1" });
    mockGetActiveSessionForChildAndWorld.mockResolvedValueOnce({
      id: "session-1",
    });
    mockFindOpportunityById.mockResolvedValueOnce({
      getState: () => ({
        id: OPPORTUNITY_ID,
        householdId: HOUSEHOLD_ID,
        sourceNpcId: "npc-1",
        childProfileId: CHILD_ID,
        opportunityType: "rumor",
        message: "I heard something.",
        evidence: { claim: "moon is made of cheese" },
        score: 0.8,
        cooldownKeys: [],
        expiresAt: new Date(),
        status: "accepted",
        respondedAt: new Date(),
        reason: "test",
        createdAt: new Date(),
      }),
    });
    mockCreateHook.mockResolvedValueOnce({
      hook: {
        id: "hook-1",
        hookType: "rumor",
        sceneType: "narrative",
        status: "pending",
      },
      created: true,
    });

    const route = (await import(
      "@/app/api/interactions/opportunities/[opportunityId]/respond/route"
    )) as { POST: Route };
    const response = await route.POST(
      new Request(
        `http://localhost/api/interactions/opportunities/${OPPORTUNITY_ID}/respond`,
        {
          method: "POST",
          body: JSON.stringify({
            householdId: HOUSEHOLD_ID,
            childProfileId: CHILD_ID,
            response: "accepted",
          }),
        },
      ),
      { params: Promise.resolve({ opportunityId: OPPORTUNITY_ID }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.hook.id).toBe("hook-1");
    expect(body.hook.created).toBe(true);
    expect(mockRespond).toHaveBeenCalledWith(
      HOUSEHOLD_ID,
      OPPORTUNITY_ID,
      "accepted",
    );
    const hookInput = mockCreateHook.mock.calls[0]![0];
    expect(hookInput.opportunityId).toBe(OPPORTUNITY_ID);
    expect(hookInput.storySessionId).toBe("session-1");
    expect(hookInput.worldId).toBe("world-1");
    expect(hookInput.hookType).toBe("rumor");
    expect(hookInput.payload).toMatchObject({
      claim: "moon is made of cheese",
    });
  });

  it("returns 404 when the child has no active session", async () => {
    mockGetOwnedHousehold.mockResolvedValueOnce({ id: HOUSEHOLD_ID });
    mockFindChildProfileForUser.mockResolvedValueOnce({ id: CHILD_ID });
    mockRespond.mockResolvedValueOnce(undefined);
    mockListCharactersByChildProfile.mockResolvedValueOnce([
      { id: "character-1", name: "Lumi" },
    ]);
    mockGetWorldForCharacter.mockResolvedValueOnce({ id: "world-1" });
    mockGetActiveSessionForChildAndWorld.mockResolvedValueOnce(undefined);

    const route = (await import(
      "@/app/api/interactions/opportunities/[opportunityId]/respond/route"
    )) as { POST: Route };
    const response = await route.POST(
      new Request(
        `http://localhost/api/interactions/opportunities/${OPPORTUNITY_ID}/respond`,
        {
          method: "POST",
          body: JSON.stringify({
            householdId: HOUSEHOLD_ID,
            childProfileId: CHILD_ID,
            response: "accepted",
          }),
        },
      ),
      { params: Promise.resolve({ opportunityId: OPPORTUNITY_ID }) },
    );

    expect(response.status).toBe(404);
    expect(mockCreateHook).not.toHaveBeenCalled();
  });
});
