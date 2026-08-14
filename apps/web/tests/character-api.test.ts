import { describe, it, expect, vi } from "vitest";

const mockGetCharacterDomain = vi.fn();
const mockGetCharacterById = vi.fn();
const mockArchiveCharacter = vi.fn();
const mockApplyTraitDeltas = vi.fn();
const mockUpdateEmotions = vi.fn();
const mockUpdateNeeds = vi.fn();
const mockAddGoal = vi.fn();
const mockCompleteGoal = vi.fn();
const mockUpsertInfluence = vi.fn();
const mockAddRelationship = vi.fn();
const mockUpdateLocation = vi.fn();
const mockGetCharacterEvents = vi.fn();
const mockListCharactersByChildProfile = vi.fn();
const mockListCharactersByHousehold = vi.fn();

vi.mock("@lumi/profiles/application", () => ({
  getCharacterDomain: (...args: unknown[]) => mockGetCharacterDomain(...args),
  getCharacterById: (...args: unknown[]) => mockGetCharacterById(...args),
  archiveCharacter: (...args: unknown[]) => mockArchiveCharacter(...args),
  applyTraitDeltas: (...args: unknown[]) => mockApplyTraitDeltas(...args),
  updateEmotions: (...args: unknown[]) => mockUpdateEmotions(...args),
  updateNeeds: (...args: unknown[]) => mockUpdateNeeds(...args),
  addGoal: (...args: unknown[]) => mockAddGoal(...args),
  completeGoal: (...args: unknown[]) => mockCompleteGoal(...args),
  upsertInfluence: (...args: unknown[]) => mockUpsertInfluence(...args),
  addRelationship: (...args: unknown[]) => mockAddRelationship(...args),
  updateLocation: (...args: unknown[]) => mockUpdateLocation(...args),
  getCharacterEvents: (...args: unknown[]) => mockGetCharacterEvents(...args),
  listCharactersByChildProfile: (...args: unknown[]) =>
    mockListCharactersByChildProfile(...args),
  listCharactersByHousehold: (...args: unknown[]) =>
    mockListCharactersByHousehold(...args),
}));

vi.mock("@/lib/auth/with-parent", () => ({
  withParent: (fn: (parent: { id: string }) => Promise<Response>) =>
    fn({ id: "parent-user-id" }),
}));

import {
  DomainError,
  NotFoundError,
  AuthorizationError,
} from "@lumi/profiles/domain";

type RouteModule = {
  GET?: (
    request: Request,
    ctx: { params: Promise<{ id: string }> },
  ) => Promise<Response>;
  POST?: (
    request: Request,
    ctx: { params: Promise<{ id: string }> },
  ) => Promise<Response>;
  DELETE?: (
    request: Request,
    ctx: { params: Promise<{ id: string }> },
  ) => Promise<Response>;
  PATCH?: (
    request: Request,
    ctx: { params: Promise<{ id: string }> },
  ) => Promise<Response>;
};

const CHARACTER_ID = "11111111-1111-1111-1111-111111111111";

function makeRequest(url: string, options: RequestInit = {}): Request {
  return new Request(url, {
    headers: { "content-type": "application/json" },
    ...options,
  });
}

describe("S06 - Character API Contract", () => {
  describe("GET /api/characters/[id]", () => {
    it("returns 400 when householdId is missing", async () => {
      const route = (await import(
        "@/app/api/characters/[id]/route"
      )) as RouteModule;
      const req = makeRequest("http://localhost/api/characters/123");
      const ctx = { params: Promise.resolve({ id: CHARACTER_ID }) };
      const res = await route.GET!(req, ctx);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("VALIDATION_ERROR");
    });

    it("returns 404 for missing character with domain=true", async () => {
      mockGetCharacterDomain.mockRejectedValueOnce(
        new NotFoundError("Character", CHARACTER_ID),
      );
      const route = (await import(
        "@/app/api/characters/[id]/route"
      )) as RouteModule;
      const req = makeRequest(
        "http://localhost/api/characters/111?householdId=h1&domain=true",
      );
      const ctx = { params: Promise.resolve({ id: CHARACTER_ID }) };
      const res = await route.GET!(req, ctx);
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe("NOT_FOUND");
    });

    it("returns 403 for cross-family access", async () => {
      mockGetCharacterDomain.mockRejectedValueOnce(
        new AuthorizationError("User is not a member of this household"),
      );
      const route = (await import(
        "@/app/api/characters/[id]/route"
      )) as RouteModule;
      const req = makeRequest(
        "http://localhost/api/characters/111?householdId=h1&domain=true",
      );
      const ctx = { params: Promise.resolve({ id: CHARACTER_ID }) };
      const res = await route.GET!(req, ctx);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("FORBIDDEN");
    });
  });

  describe("DELETE /api/characters/[id]", () => {
    it("archives idempotently", async () => {
      mockArchiveCharacter.mockResolvedValueOnce({ archived: true });
      const route = (await import(
        "@/app/api/characters/[id]/route"
      )) as RouteModule;
      const req = makeRequest(
        `http://localhost/api/characters/${CHARACTER_ID}?householdId=h1`,
        { method: "DELETE" },
      );
      const ctx = { params: Promise.resolve({ id: CHARACTER_ID }) };
      const res = await route.DELETE!(req, ctx);
      expect(res.status).toBe(204);
      expect(mockArchiveCharacter).toHaveBeenCalledWith(
        "parent-user-id",
        "h1",
        CHARACTER_ID,
      );
    });
  });

  describe("PATCH /api/characters/[id]/traits", () => {
    it("returns 400 when deltas array is missing", async () => {
      const route = (await import(
        "@/app/api/characters/[id]/traits/route"
      )) as RouteModule;
      const req = makeRequest(
        "http://localhost/api/characters/111/traits?householdId=h1",
        { method: "PATCH", body: JSON.stringify({}) },
      );
      const ctx = { params: Promise.resolve({ id: CHARACTER_ID }) };
      const res = await route.PATCH!(req, ctx);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("VALIDATION_ERROR");
    });

    it("returns 404 for missing character", async () => {
      mockApplyTraitDeltas.mockRejectedValueOnce(
        new NotFoundError("Character", CHARACTER_ID),
      );
      const route = (await import(
        "@/app/api/characters/[id]/traits/route"
      )) as RouteModule;
      const req = makeRequest(
        "http://localhost/api/characters/111/traits?householdId=h1",
        {
          method: "PATCH",
          body: JSON.stringify({
            deltas: [
              {
                dimension: "courage",
                oldValue: 0.5,
                newValue: 0.6,
                evidence: "test",
                deltaMagnitude: 0.1,
              },
            ],
          }),
        },
      );
      const ctx = { params: Promise.resolve({ id: CHARACTER_ID }) };
      const res = await route.PATCH!(req, ctx);
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe("NOT_FOUND");
    });

    it("returns 409 for version conflict", async () => {
      mockApplyTraitDeltas.mockRejectedValueOnce(
        new DomainError("VERSION_CONFLICT", "version conflict"),
      );
      const route = (await import(
        "@/app/api/characters/[id]/traits/route"
      )) as RouteModule;
      const req = makeRequest(
        "http://localhost/api/characters/111/traits?householdId=h1",
        {
          method: "PATCH",
          body: JSON.stringify({
            deltas: [
              {
                dimension: "courage",
                oldValue: 0.5,
                newValue: 0.6,
                evidence: "test",
                deltaMagnitude: 0.1,
              },
            ],
          }),
        },
      );
      const ctx = { params: Promise.resolve({ id: CHARACTER_ID }) };
      const res = await route.PATCH!(req, ctx);
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error).toBe("VERSION_CONFLICT");
    });
  });

  describe("PATCH /api/characters/[id]/needs", () => {
    it("returns 404 for missing character", async () => {
      mockUpdateNeeds.mockRejectedValueOnce(
        new NotFoundError("Character", CHARACTER_ID),
      );
      const route = (await import(
        "@/app/api/characters/[id]/needs/route"
      )) as RouteModule;
      const req = makeRequest(
        "http://localhost/api/characters/111/needs?householdId=h1",
        {
          method: "PATCH",
          body: JSON.stringify([
            { needType: "hunger", value: 0.5, decay: 0.05 },
          ]),
        },
      );
      const ctx = { params: Promise.resolve({ id: CHARACTER_ID }) };
      const res = await route.PATCH!(req, ctx);
      expect(res.status).toBe(404);
    });

    it("returns 409 for version conflict", async () => {
      mockUpdateNeeds.mockRejectedValueOnce(
        new DomainError("VERSION_CONFLICT", "version conflict"),
      );
      const route = (await import(
        "@/app/api/characters/[id]/needs/route"
      )) as RouteModule;
      const req = makeRequest(
        "http://localhost/api/characters/111/needs?householdId=h1",
        {
          method: "PATCH",
          body: JSON.stringify([
            { needType: "hunger", value: 0.5, decay: 0.05 },
          ]),
        },
      );
      const ctx = { params: Promise.resolve({ id: CHARACTER_ID }) };
      const res = await route.PATCH!(req, ctx);
      expect(res.status).toBe(409);
    });
  });

  describe("PATCH /api/characters/[id]/influence", () => {
    it("returns 404 for missing character", async () => {
      mockUpsertInfluence.mockRejectedValueOnce(
        new NotFoundError("Character", CHARACTER_ID),
      );
      const route = (await import(
        "@/app/api/characters/[id]/influence/route"
      )) as RouteModule;
      const req = makeRequest(
        "http://localhost/api/characters/111/influence?householdId=h1",
        { method: "PATCH", body: JSON.stringify({ emotional: 0.5 }) },
      );
      const ctx = { params: Promise.resolve({ id: CHARACTER_ID }) };
      const res = await route.PATCH!(req, ctx);
      expect(res.status).toBe(404);
    });

    it("returns 409 for version conflict", async () => {
      mockUpsertInfluence.mockRejectedValueOnce(
        new DomainError("VERSION_CONFLICT", "version conflict"),
      );
      const route = (await import(
        "@/app/api/characters/[id]/influence/route"
      )) as RouteModule;
      const req = makeRequest(
        "http://localhost/api/characters/111/influence?householdId=h1",
        { method: "PATCH", body: JSON.stringify({ emotional: 0.5 }) },
      );
      const ctx = { params: Promise.resolve({ id: CHARACTER_ID }) };
      const res = await route.PATCH!(req, ctx);
      expect(res.status).toBe(409);
    });
  });

  describe("GET /api/characters/[id]/events", () => {
    it("returns 404 for missing character", async () => {
      mockGetCharacterEvents.mockRejectedValueOnce(
        new NotFoundError("Character", CHARACTER_ID),
      );
      const route = (await import(
        "@/app/api/characters/[id]/events/route"
      )) as RouteModule;
      const req = makeRequest(
        "http://localhost/api/characters/111/events?householdId=h1",
      );
      const ctx = { params: Promise.resolve({ id: CHARACTER_ID }) };
      const res = await route.GET!(req, ctx);
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/characters with childProfileId", () => {
    it("filters characters by childProfileId when provided", async () => {
      const mockCharacter = {
        id: "char-1",
        householdId: "h1",
        childProfileId: "cp-1",
        name: "Test Character",
        broadKind: "human",
        characterType: "explorer",
        subtype: "test",
        originMode: "auto",
        originConcept: "test",
        startingLocation: "test",
        homeArchetype: "test",
        createdAt: new Date(),
      };
      mockListCharactersByChildProfile.mockResolvedValueOnce([mockCharacter]);

      const route = (await import("@/app/api/characters/route")) as {
        GET: (request: Request) => Promise<Response>;
      };
      const req = makeRequest(
        "http://localhost/api/characters?householdId=h1&childProfileId=cp-1",
      );
      const res = await route.GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.characters).toHaveLength(1);
      expect(body.characters[0].childProfileId).toBe("cp-1");
      expect(mockListCharactersByChildProfile).toHaveBeenCalledWith(
        "parent-user-id",
        "h1",
        "cp-1",
      );
    });

    it("returns empty array when childProfileId has no characters", async () => {
      mockListCharactersByChildProfile.mockResolvedValueOnce([]);

      const route = (await import("@/app/api/characters/route")) as {
        GET: (request: Request) => Promise<Response>;
      };
      const req = makeRequest(
        "http://localhost/api/characters?householdId=h1&childProfileId=cp-empty",
      );
      const res = await route.GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.characters).toHaveLength(0);
    });

    it("returns 403 for cross-family access", async () => {
      mockListCharactersByChildProfile.mockRejectedValueOnce(
        new AuthorizationError("User is not a member of this household"),
      );

      const route = (await import("@/app/api/characters/route")) as {
        GET: (request: Request) => Promise<Response>;
      };
      const req = makeRequest(
        "http://localhost/api/characters?householdId=other-family&childProfileId=cp-1",
      );
      const res = await route.GET(req);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("FORBIDDEN");
    });
  });
});
