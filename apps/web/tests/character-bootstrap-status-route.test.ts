import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetCharacterById = vi.fn();
const mockGetCharacterDomain = vi.fn();
const mockGetCharacterFoundationByCharacterId = vi.fn();
const mockArchiveCharacter = vi.fn();

vi.mock("@lumi/profiles/application", () => ({
  getCharacterById: (...args: unknown[]) => mockGetCharacterById(...args),
  getCharacterDomain: (...args: unknown[]) => mockGetCharacterDomain(...args),
  getCharacterFoundationByCharacterId: (...args: unknown[]) =>
    mockGetCharacterFoundationByCharacterId(...args),
  archiveCharacter: (...args: unknown[]) => mockArchiveCharacter(...args),
}));

vi.mock("@/lib/auth/with-parent", () => ({
  withParent: (fn: (parent: { id: string }) => Promise<Response>) =>
    fn({ id: "parent-user-id" }),
}));

import { AuthorizationError } from "@lumi/profiles/domain";

const CHARACTER_ID = "11111111-1111-1111-1111-111111111111";
const HOUSEHOLD_ID = "household-1";

function request() {
  return new Request(
    `http://localhost/api/characters/${CHARACTER_ID}?householdId=${HOUSEHOLD_ID}&bootstrap=true`,
  );
}

describe("GET /api/characters/[id]?bootstrap=true", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only the scoped Living World bootstrap summary", async () => {
    mockGetCharacterById.mockResolvedValueOnce({
      id: CHARACTER_ID,
      householdId: HOUSEHOLD_ID,
      name: "Kaan",
    });
    mockGetCharacterFoundationByCharacterId.mockResolvedValueOnce({
      bootstrapManifest: {
        status: "completed",
        idempotencyKey: "living-world-bootstrap:cycle-1",
        worldId: "world-1",
        foundationVersion: 1,
        bootstrapVersion: 1,
        materialized: [
          { kind: "npc", entityId: "npc-1" },
          { kind: "relationship", entityId: "rel-1" },
          { kind: "location_fact", entityId: "location-1" },
        ],
        updatedAt: new Date("2026-08-21T08:00:00.000Z"),
      },
    });

    const route = await import("@/app/api/characters/[id]/route");
    const response = await route.GET(request(), {
      params: Promise.resolve({ id: CHARACTER_ID }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetCharacterById).toHaveBeenCalledWith(
      "parent-user-id",
      HOUSEHOLD_ID,
      CHARACTER_ID,
    );
    expect(mockGetCharacterFoundationByCharacterId).toHaveBeenCalledWith(
      CHARACTER_ID,
    );
    expect(body.bootstrap).toMatchObject({
      status: "completed",
      idempotencyKey: "living-world-bootstrap:cycle-1",
      worldId: "world-1",
      materializedCount: 3,
      materializedByKind: {
        npc: 1,
        relationship: 1,
        location_fact: 1,
      },
    });
    expect(body.bootstrap).not.toHaveProperty("genesis");
    expect(body.bootstrap).not.toHaveProperty("sagaCanon");
  });

  it("does not read foundation data when household scope is rejected", async () => {
    mockGetCharacterById.mockRejectedValueOnce(
      new AuthorizationError("User is not a member of this household"),
    );

    const route = await import("@/app/api/characters/[id]/route");
    const response = await route.GET(request(), {
      params: Promise.resolve({ id: CHARACTER_ID }),
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("FORBIDDEN");
    expect(mockGetCharacterFoundationByCharacterId).not.toHaveBeenCalled();
  });
});
