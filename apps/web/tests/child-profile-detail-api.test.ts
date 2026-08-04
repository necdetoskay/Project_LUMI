import { describe, it, expect, vi } from "vitest";

const mockFindChildProfileForUser = vi.fn();
const mockUpdateChildProfile = vi.fn();

vi.mock("@lumi/profiles/application", () => ({
  findChildProfileForUser: (...args: unknown[]) =>
    mockFindChildProfileForUser(...args),
  updateChildProfile: (...args: unknown[]) => mockUpdateChildProfile(...args),
}));

vi.mock("@/lib/auth/with-parent", () => ({
  withParent: (fn: (parent: { id: string }) => Promise<Response>) =>
    fn({ id: "parent-user-id" }),
}));

import { AuthorizationError } from "@lumi/profiles/domain";

type RouteModule = {
  GET?: (
    request: Request,
    ctx: { params: Promise<{ id: string }> },
  ) => Promise<Response>;
  PATCH?: (
    request: Request,
    ctx: { params: Promise<{ id: string }> },
  ) => Promise<Response>;
};

const PROFILE_ID = "22222222-2222-2222-2222-222222222222";

function makeRequest(url: string, options: RequestInit = {}): Request {
  return new Request(url, {
    headers: { "content-type": "application/json" },
    ...options,
  });
}

describe("S07 - Child Profile Detail API", () => {
  describe("GET /api/child-profiles/[id]", () => {
    it("returns 400 when householdId is missing", async () => {
      const route = (await import(
        "@/app/api/child-profiles/[id]/route"
      )) as RouteModule;
      const req = makeRequest(
        `http://localhost/api/child-profiles/${PROFILE_ID}`,
      );
      const ctx = { params: Promise.resolve({ id: PROFILE_ID }) };
      const res = await route.GET!(req, ctx);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("VALIDATION_ERROR");
    });

    it("returns 404 for non-existent profile", async () => {
      mockFindChildProfileForUser.mockResolvedValueOnce(null);

      const route = (await import(
        "@/app/api/child-profiles/[id]/route"
      )) as RouteModule;
      const req = makeRequest(
        `http://localhost/api/child-profiles/${PROFILE_ID}?householdId=h1`,
      );
      const ctx = { params: Promise.resolve({ id: PROFILE_ID }) };
      const res = await route.GET!(req, ctx);
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe("NOT_FOUND");
    });

    it("returns 403 for cross-family access", async () => {
      mockFindChildProfileForUser.mockRejectedValueOnce(
        new AuthorizationError("User is not a member of this household"),
      );

      const route = (await import(
        "@/app/api/child-profiles/[id]/route"
      )) as RouteModule;
      const req = makeRequest(
        `http://localhost/api/child-profiles/${PROFILE_ID}?householdId=other-family`,
      );
      const ctx = { params: Promise.resolve({ id: PROFILE_ID }) };
      const res = await route.GET!(req, ctx);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("FORBIDDEN");
    });

    it("returns profile for valid household member", async () => {
      const mockProfile = {
        id: PROFILE_ID,
        householdId: "h1",
        displayName: "Test Child",
        ageBand: "6-8",
        locale: "tr-TR",
        createdAt: new Date("2025-01-15"),
      };
      mockFindChildProfileForUser.mockResolvedValueOnce(mockProfile);

      const route = (await import(
        "@/app/api/child-profiles/[id]/route"
      )) as RouteModule;
      const req = makeRequest(
        `http://localhost/api/child-profiles/${PROFILE_ID}?householdId=h1`,
      );
      const ctx = { params: Promise.resolve({ id: PROFILE_ID }) };
      const res = await route.GET!(req, ctx);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.profile.id).toBe(PROFILE_ID);
      expect(body.profile.displayName).toBe("Test Child");
      expect(body.profile.ageBand).toBe("6-8");
    });
  });
});
