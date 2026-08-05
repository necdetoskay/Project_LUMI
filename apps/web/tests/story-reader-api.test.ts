import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindChildProfileForUser = vi.fn();
const mockGetHouseholdForUser = vi.fn();
const mockGetOwnedHousehold = vi.fn();
const mockListSessionsForChildProfile = vi.fn();
const mockEnsureStarterStoriesForHousehold = vi.fn();
const mockListCharactersByChildProfile = vi.fn();
const mockGetWorldForCharacter = vi.fn();
const mockGetWorldDetail = vi.fn();
const mockGetCharacterCurrentLocation = vi.fn();
const mockListInventory = vi.fn();
const mockGetStorySessionOrForbidden = vi.fn();
const mockGetSessionPlaybackState = vi.fn();
const mockGetStoryVersionGraph = vi.fn();
const mockListChoicePointsByScene = vi.fn();
const mockEvaluateChoicePointAvailability = vi.fn();

vi.mock("@lumi/profiles/application", () => ({
  findChildProfileForUser: (...args: unknown[]) =>
    mockFindChildProfileForUser(...args),
  getHouseholdForUser: (...args: unknown[]) => mockGetHouseholdForUser(...args),
  getOwnedHousehold: (...args: unknown[]) => mockGetOwnedHousehold(...args),
  listCharactersByChildProfile: (...args: unknown[]) =>
    mockListCharactersByChildProfile(...args),
  listInventory: (...args: unknown[]) => mockListInventory(...args),
}));

vi.mock("@lumi/story/application", () => ({
  listSessionsForChildProfile: (...args: unknown[]) =>
    mockListSessionsForChildProfile(...args),
  ensureStarterStoriesForHousehold: (...args: unknown[]) =>
    mockEnsureStarterStoriesForHousehold(...args),
  getStorySessionOrForbidden: (...args: unknown[]) =>
    mockGetStorySessionOrForbidden(...args),
  getSessionPlaybackState: (...args: unknown[]) =>
    mockGetSessionPlaybackState(...args),
  getStoryVersionGraph: (...args: unknown[]) =>
    mockGetStoryVersionGraph(...args),
  listChoicePointsByScene: (...args: unknown[]) =>
    mockListChoicePointsByScene(...args),
  evaluateChoicePointAvailability: (...args: unknown[]) =>
    mockEvaluateChoicePointAvailability(...args),
}));

vi.mock("@/lib/auth/with-parent", () => ({
  withParent: (fn: (parent: { id: string }) => Promise<Response>) =>
    fn({ id: "parent-user-id" }),
}));

vi.mock("@lumi/world/application", () => ({
  getWorldForCharacter: (...args: unknown[]) =>
    mockGetWorldForCharacter(...args),
  getWorldDetail: (...args: unknown[]) => mockGetWorldDetail(...args),
  getCharacterCurrentLocation: (...args: unknown[]) =>
    mockGetCharacterCurrentLocation(...args),
}));

type GetRoute = (
  request: Request,
  ctx: { params: Promise<Record<string, string>> },
) => Promise<Response>;

const HOUSEHOLD_ID = "11111111-1111-4111-8111-111111111111";
const CHILD_ID = "22222222-2222-4222-8222-222222222222";
const SESSION_ID = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("story reader routes", () => {
  it("lists story sessions for a child profile", async () => {
    mockGetHouseholdForUser.mockResolvedValueOnce({ id: HOUSEHOLD_ID });
    mockFindChildProfileForUser.mockResolvedValueOnce({ id: CHILD_ID });
    mockListSessionsForChildProfile.mockResolvedValueOnce([
      {
        session: {
          id: SESSION_ID,
          sessionStatus: "active",
          playbackMode: "reading",
          updatedAt: "2026-08-04T08:00:00.000Z",
        },
        currentScene: null,
        definition: null,
        version: null,
        latestCheckpoint: null,
      },
    ]);

    mockEnsureStarterStoriesForHousehold.mockResolvedValueOnce([
      {
        definition: { id: "story-1", title: "Orman Macerasi" },
        version: { id: "version-1", versionNumber: 1, title: "V1" },
      },
    ]);
    mockListCharactersByChildProfile.mockResolvedValueOnce([
      {
        id: "character-1",
        childProfileId: CHILD_ID,
        name: "Lumi",
        characterType: "explorer",
        subtype: "fox",
      },
    ]);
    mockGetWorldForCharacter.mockResolvedValueOnce({
      id: "world-1",
      lifecycleStatus: "active",
      metadata: { name: "Ay Isigi Vadisi" },
    });
    mockGetWorldDetail.mockResolvedValueOnce({
      latestCheckpoint: { checkpointSequence: 3 },
    });
    mockGetCharacterCurrentLocation.mockResolvedValueOnce({
      id: "loc-1",
      displayName: "Ayriik Cayi",
      locationType: "river",
    });
    mockListInventory.mockResolvedValueOnce([
      {
        id: "item-1",
        displayName: "Parlayan Fener",
        category: "tool",
        rarity: "common",
        quantity: 1,
      },
    ]);

    const route = (await import(
      "@/app/api/child-profiles/[id]/stories/route"
    )) as { GET: GetRoute };
    const response = await route.GET(
      new Request(
        `http://localhost/api/child-profiles/${CHILD_ID}/stories?householdId=${HOUSEHOLD_ID}`,
      ),
      { params: Promise.resolve({ id: CHILD_ID }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.sessions).toHaveLength(1);
    expect(body.sessions[0].session.id).toBe(SESSION_ID);
  });

  it("adds derived story source cards for world and inventory context", async () => {
    mockGetHouseholdForUser.mockResolvedValueOnce({ id: HOUSEHOLD_ID });
    mockFindChildProfileForUser.mockResolvedValueOnce({ id: CHILD_ID });
    mockListSessionsForChildProfile.mockResolvedValueOnce([]);
    mockEnsureStarterStoriesForHousehold.mockResolvedValueOnce([]);
    mockListCharactersByChildProfile.mockResolvedValueOnce([
      {
        id: "character-1",
        childProfileId: CHILD_ID,
        name: "Lumi",
        characterType: "explorer",
        subtype: "fox",
        originConcept: "Kayip isiklarin pesine dusen bir kasif",
        startingLocation: "Yuva Kenari",
        homeArchetype: "Agac Evi",
      },
    ]);
    mockGetWorldForCharacter.mockResolvedValueOnce({
      id: "world-1",
      lifecycleStatus: "active",
      metadata: { name: "Ay Isigi Vadisi" },
    });
    mockGetWorldDetail.mockResolvedValueOnce({ latestCheckpoint: { checkpointSequence: 2 } });
    mockGetCharacterCurrentLocation.mockResolvedValueOnce({
      id: "loc-1",
      displayName: "Sakin Koy",
      locationType: "shore",
    });
    mockListInventory.mockResolvedValueOnce([
      {
        id: "item-1",
        displayName: "Parlayan Fener",
        category: "tool",
        rarity: "common",
        quantity: 1,
      },
    ]);

    const route = (await import(
      "@/app/api/child-profiles/[id]/stories/route"
    )) as { GET: GetRoute };
    const response = await route.GET(
      new Request(
        `http://localhost/api/child-profiles/${CHILD_ID}/stories?householdId=${HOUSEHOLD_ID}`,
      ),
      { params: Promise.resolve({ id: CHILD_ID }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.launchOptions[0].storySources).toHaveLength(3);
    expect(body.launchOptions[0].storySources[0].title).toBe("Sakin Koy");
    expect(body.launchOptions[0].storySources[2].title).toBe("Parlayan Fener");
  });

  it("keeps launch options alive when world metadata is empty", async () => {
    mockGetHouseholdForUser.mockResolvedValueOnce({ id: HOUSEHOLD_ID });
    mockFindChildProfileForUser.mockResolvedValueOnce({ id: CHILD_ID });
    mockListSessionsForChildProfile.mockResolvedValueOnce([]);
    mockEnsureStarterStoriesForHousehold.mockResolvedValueOnce([]);
    mockListCharactersByChildProfile.mockResolvedValueOnce([
      {
        id: "character-1",
        childProfileId: CHILD_ID,
        name: "Lumi",
        characterType: "explorer",
        subtype: "fox",
      },
    ]);
    mockGetWorldForCharacter.mockResolvedValueOnce({
      id: "world-1",
      lifecycleStatus: "active",
      metadata: null,
    });

    const route = (await import(
      "@/app/api/child-profiles/[id]/stories/route"
    )) as { GET: GetRoute };
    const response = await route.GET(
      new Request(
        `http://localhost/api/child-profiles/${CHILD_ID}/stories?householdId=${HOUSEHOLD_ID}`,
      ),
      { params: Promise.resolve({ id: CHILD_ID }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.launchOptions[0].world.label).toBe("World world-1");
  });

  it("builds reader state with resolved next scene ids", async () => {
    mockGetOwnedHousehold.mockResolvedValueOnce({ id: HOUSEHOLD_ID });
    mockGetStorySessionOrForbidden.mockResolvedValueOnce(undefined);
    mockGetSessionPlaybackState.mockResolvedValueOnce({
      session: {
        id: SESSION_ID,
        childProfileId: CHILD_ID,
        storyVersionId: "version-1",
        version: 4,
      },
      currentScene: {
        id: "scene-1",
        sceneKey: "intro",
        title: "Intro",
        narrativeText: "Hello",
      },
      visits: [{ id: "visit-1" }],
      latestCheckpoint: {
        contentHash: "hash-1",
        createdAt: "2026-08-04T08:00:00.000Z",
      },
    });
    mockGetStoryVersionGraph.mockResolvedValueOnce({
      definition: { id: "definition-1" },
      version: { id: "version-1", versionNumber: 1, title: "V1" },
      scenes: [
        { id: "scene-1", sceneKey: "intro" },
        { id: "scene-2", sceneKey: "forest_path" },
      ],
      transitions: [
        {
          id: "transition-1",
          fromSceneId: "scene-1",
          toSceneId: "scene-2",
          transitionType: "choice",
        },
      ],
    });
    mockListChoicePointsByScene.mockResolvedValueOnce([
      { id: "point-1", prompt: "Nereye gidelim?" },
    ]);
    mockEvaluateChoicePointAvailability.mockResolvedValueOnce({
      point: { id: "point-1", prompt: "Nereye gidelim?" },
      options: [
        {
          option: {
            id: "option-1",
            label: "Ormana git",
            consequencePreviews: [
              { consequenceType: "scene_transition", targetKey: "forest_path" },
            ],
          },
          available: true,
          reasonCode: null,
        },
      ],
    });

    const route = (await import(
      "@/app/api/stories/sessions/[sessionId]/reader/route"
    )) as { GET: GetRoute };
    const response = await route.GET(
      new Request(
        `http://localhost/api/stories/sessions/${SESSION_ID}/reader?householdId=${HOUSEHOLD_ID}`,
      ),
      { params: Promise.resolve({ sessionId: SESSION_ID }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.choices[0].options[0].nextSceneId).toBe("scene-2");
    expect(body.graph.transitions).toHaveLength(1);
  });
});
