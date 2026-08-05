import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindChildProfileForUser = vi.fn();
const mockGetHouseholdForUser = vi.fn();
const mockListCharactersByChildProfile = vi.fn();
const mockGetWorldForCharacter = vi.fn();
const mockGetWorldDetail = vi.fn();
const mockGetCharacterCurrentLocation = vi.fn();

vi.mock("@lumi/profiles/application", () => ({
  findChildProfileForUser: (...args: unknown[]) =>
    mockFindChildProfileForUser(...args),
  getHouseholdForUser: (...args: unknown[]) => mockGetHouseholdForUser(...args),
  listCharactersByChildProfile: (...args: unknown[]) =>
    mockListCharactersByChildProfile(...args),
}));

vi.mock("@lumi/world/application", () => ({
  getWorldForCharacter: (...args: unknown[]) =>
    mockGetWorldForCharacter(...args),
  getWorldDetail: (...args: unknown[]) => mockGetWorldDetail(...args),
  getCharacterCurrentLocation: (...args: unknown[]) =>
    mockGetCharacterCurrentLocation(...args),
}));

vi.mock("@/lib/auth/with-parent", () => ({
  withParent: (fn: (parent: { id: string }) => Promise<Response>) =>
    fn({ id: "parent-user-id" }),
}));

type GetRoute = (
  request: Request,
  ctx: { params: Promise<Record<string, string>> },
) => Promise<Response>;

const HOUSEHOLD_ID = "11111111-1111-4111-8111-111111111111";
const CHILD_ID = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("world map route", () => {
  it("returns spoiler-safe world map summary for a child profile", async () => {
    mockGetHouseholdForUser.mockResolvedValueOnce({ id: HOUSEHOLD_ID });
    mockFindChildProfileForUser.mockResolvedValueOnce({
      id: CHILD_ID,
      displayName: "Lumi",
      ageBand: "6-8",
    });
    mockListCharactersByChildProfile.mockResolvedValueOnce([
      {
        id: "character-1",
        name: "Lumi",
        characterType: "explorer",
        subtype: "fox",
      },
    ]);
    mockGetWorldForCharacter.mockResolvedValueOnce({
      id: "world-1",
      childProfileId: CHILD_ID,
      characterId: "character-1",
      lifecycleStatus: "active",
    });
    mockGetWorldDetail.mockResolvedValueOnce({
      world: { id: "world-1" },
      regions: [
        {
          id: "region-1",
          regionKey: "starter",
          displayName: "Baslangic Vadisi",
          regionType: "forest",
          accessibilityStatus: "open",
          discoveryStatus: "discovered",
        },
        {
          id: "region-2",
          regionKey: "mystery",
          displayName: "Gizli Magara",
          regionType: "underground",
          accessibilityStatus: "restricted",
          discoveryStatus: "unknown",
        },
      ],
      locations: [
        {
          id: "location-1",
          regionId: "region-1",
          locationKey: "home",
          displayName: "Yuva",
          locationType: "den",
          accessibilityStatus: "open",
          isHome: true,
          safetyLevel: "safe",
        },
        {
          id: "location-2",
          regionId: "region-2",
          locationKey: "secret-cave",
          displayName: "Sirr Magarasi",
          locationType: "cave",
          accessibilityStatus: "blocked",
          isHome: false,
          safetyLevel: "risky",
        },
      ],
      home: { locationId: "location-1" },
      latestCheckpoint: { id: "checkpoint-1" },
    });
    mockGetCharacterCurrentLocation.mockResolvedValueOnce({
      id: "location-1",
      regionId: "region-1",
      displayName: "Yuva",
      locationType: "den",
    });

    const route = (await import(
      "@/app/api/child-profiles/[id]/world/route"
    )) as { GET: GetRoute };
    const response = await route.GET(
      new Request(
        `http://localhost/api/child-profiles/${CHILD_ID}/world?householdId=${HOUSEHOLD_ID}`,
      ),
      { params: Promise.resolve({ id: CHILD_ID }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.world.id).toBe("world-1");
    expect(body.world.currentLocation.displayName).toBe("Yuva");
    expect(body.world.regions).toHaveLength(2);
    expect(body.world.regions[0].displayName).toBe("Baslangic Vadisi");
    expect(body.world.regions[0].locations).toHaveLength(1);
    expect(body.world.regions[1].displayName).toBe("Kesfedilmemis bolge");
    expect(body.world.regions[1].regionType).toBe("unknown");
    expect(body.world.regions[1].locations).toHaveLength(0);
  });

  it("returns null world when child profile has no character yet", async () => {
    mockGetHouseholdForUser.mockResolvedValueOnce({ id: HOUSEHOLD_ID });
    mockFindChildProfileForUser.mockResolvedValueOnce({
      id: CHILD_ID,
      displayName: "Lumi",
      ageBand: "6-8",
    });
    mockListCharactersByChildProfile.mockResolvedValueOnce([]);

    const route = (await import(
      "@/app/api/child-profiles/[id]/world/route"
    )) as { GET: GetRoute };
    const response = await route.GET(
      new Request(
        `http://localhost/api/child-profiles/${CHILD_ID}/world?householdId=${HOUSEHOLD_ID}`,
      ),
      { params: Promise.resolve({ id: CHILD_ID }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.world).toBeNull();
    expect(body.character).toBeNull();
  });

  it("uses the requested character when characterId is provided", async () => {
    mockGetHouseholdForUser.mockResolvedValueOnce({ id: HOUSEHOLD_ID });
    mockFindChildProfileForUser.mockResolvedValueOnce({
      id: CHILD_ID,
      displayName: "Lumi",
      ageBand: "6-8",
    });
    mockListCharactersByChildProfile.mockResolvedValueOnce([
      {
        id: "character-1",
        name: "Lumi",
        characterType: "explorer",
        subtype: "fox",
      },
      {
        id: "character-2",
        name: "Mira",
        characterType: "inventor",
        subtype: "owl",
      },
    ]);
    mockGetWorldForCharacter.mockResolvedValueOnce({
      id: "world-2",
      childProfileId: CHILD_ID,
      characterId: "character-2",
      lifecycleStatus: "active",
    });
    mockGetWorldDetail.mockResolvedValueOnce({
      world: { id: "world-2" },
      regions: [],
      locations: [],
      home: null,
      latestCheckpoint: null,
    });
    mockGetCharacterCurrentLocation.mockResolvedValueOnce(null);

    const route = (await import(
      "@/app/api/child-profiles/[id]/world/route"
    )) as { GET: GetRoute };
    const response = await route.GET(
      new Request(
        `http://localhost/api/child-profiles/${CHILD_ID}/world?householdId=${HOUSEHOLD_ID}&characterId=character-2`,
      ),
      { params: Promise.resolve({ id: CHILD_ID }) },
    );

    expect(response.status).toBe(200);
    expect(mockGetWorldForCharacter).toHaveBeenCalledWith("character-2");
    const body = await response.json();
    expect(body.character.id).toBe("character-2");
    expect(body.character.name).toBe("Mira");
    expect(body.world.characterId).toBe("character-2");
  });

  it("returns 404 when requested character does not belong to the child profile", async () => {
    mockGetHouseholdForUser.mockResolvedValueOnce({ id: HOUSEHOLD_ID });
    mockFindChildProfileForUser.mockResolvedValueOnce({
      id: CHILD_ID,
      displayName: "Lumi",
      ageBand: "6-8",
    });
    mockListCharactersByChildProfile.mockResolvedValueOnce([
      {
        id: "character-1",
        name: "Lumi",
        characterType: "explorer",
        subtype: "fox",
      },
    ]);

    const route = (await import(
      "@/app/api/child-profiles/[id]/world/route"
    )) as { GET: GetRoute };
    const response = await route.GET(
      new Request(
        `http://localhost/api/child-profiles/${CHILD_ID}/world?householdId=${HOUSEHOLD_ID}&characterId=character-404`,
      ),
      { params: Promise.resolve({ id: CHILD_ID }) },
    );

    expect(response.status).toBe(404);
    expect(mockGetWorldForCharacter).not.toHaveBeenCalled();
    const body = await response.json();
    expect(body.error).toBe("NOT_FOUND");
  });
  it("tolerates malformed location records and still returns a partial map", async () => {
    mockGetHouseholdForUser.mockResolvedValueOnce({ id: HOUSEHOLD_ID });
    mockFindChildProfileForUser.mockResolvedValueOnce({ id: CHILD_ID });
    mockListCharactersByChildProfile.mockResolvedValueOnce([
      {
        id: "character-1",
        name: "Lumi",
        characterType: "explorer",
        subtype: "fox",
      },
    ]);
    mockGetWorldForCharacter.mockResolvedValueOnce({
      id: "world-1",
      childProfileId: CHILD_ID,
      characterId: "character-1",
      lifecycleStatus: "active",
    });
    mockGetWorldDetail.mockResolvedValueOnce({
      world: { id: "world-1" },
      regions: [
        {
          id: "region-1",
          regionKey: "starter",
          displayName: "Baslangic Vadisi",
          regionType: "forest",
          accessibilityStatus: "open",
          discoveryStatus: "discovered",
        },
      ],
      locations: [
        {
          id: "location-1",
          regionId: "region-1",
          locationKey: "home",
          displayName: "Yuva",
          locationType: "den",
          accessibilityStatus: "open",
          isHome: true,
          safetyLevel: null,
        },
        {
          id: "location-bad",
          regionId: null,
          locationKey: "bad",
          displayName: "Kirli Veri",
          locationType: "unknown",
          accessibilityStatus: "open",
          isHome: false,
          safetyLevel: "safe",
        },
      ],
      home: null,
      latestCheckpoint: null,
    });
    mockGetCharacterCurrentLocation.mockResolvedValueOnce({
      id: "location-1",
      regionId: "region-1",
      displayName: "Yuva",
      locationType: "den",
    });

    const route = (await import(
      "@/app/api/child-profiles/[id]/world/route"
    )) as { GET: GetRoute };
    const response = await route.GET(
      new Request(
        `http://localhost/api/child-profiles/${CHILD_ID}/world?householdId=${HOUSEHOLD_ID}`,
      ),
      { params: Promise.resolve({ id: CHILD_ID }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.world.regions).toHaveLength(1);
    expect(body.world.regions[0].locations).toHaveLength(1);
    expect(body.world.regions[0].locations[0].safetyLevel).toBe("unknown");
  });

  it("returns a partial world response when detail lookup fails", async () => {
    mockGetHouseholdForUser.mockResolvedValueOnce({ id: HOUSEHOLD_ID });
    mockFindChildProfileForUser.mockResolvedValueOnce({ id: CHILD_ID });
    mockListCharactersByChildProfile.mockResolvedValueOnce([
      {
        id: "character-1",
        name: "Lumi",
        characterType: "explorer",
        subtype: "fox",
      },
    ]);
    mockGetWorldForCharacter.mockResolvedValueOnce({
      id: "world-1",
      childProfileId: CHILD_ID,
      characterId: "character-1",
      lifecycleStatus: "active",
    });
    mockGetWorldDetail.mockRejectedValueOnce(new Error("detail missing"));
    mockGetCharacterCurrentLocation.mockResolvedValueOnce(null);

    const route = (await import(
      "@/app/api/child-profiles/[id]/world/route"
    )) as { GET: GetRoute };
    const response = await route.GET(
      new Request(
        `http://localhost/api/child-profiles/${CHILD_ID}/world?householdId=${HOUSEHOLD_ID}`,
      ),
      { params: Promise.resolve({ id: CHILD_ID }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.world.id).toBe("world-1");
    expect(body.world.regions).toHaveLength(0);
  });
});
