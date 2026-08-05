import { describe, it, expect, vi, beforeEach } from "vitest";

const mockListConsents = vi.fn();
const mockListConsentsForChild = vi.fn();
const mockGrantConsent = vi.fn();
const mockRevokeConsent = vi.fn();
const mockExportChildData = vi.fn();
const mockListExports = vi.fn();
const mockArchiveChildData = vi.fn();
const mockGetAuditTrail = vi.fn();

vi.mock("@lumi/privacy/application", () => ({
  listConsents: (...args: unknown[]) => mockListConsents(...args),
  listConsentsForChild: (...args: unknown[]) =>
    mockListConsentsForChild(...args),
  grantConsentForHousehold: (...args: unknown[]) => mockGrantConsent(...args),
  revokeConsentForHousehold: (...args: unknown[]) => mockRevokeConsent(...args),
  exportChildData: (...args: unknown[]) => mockExportChildData(...args),
  listExportsForChild: (...args: unknown[]) => mockListExports(...args),
  archiveChildData: (...args: unknown[]) => mockArchiveChildData(...args),
  getLifecycleAuditTrail: (...args: unknown[]) => mockGetAuditTrail(...args),
}));

vi.mock("@/lib/auth/with-parent", () => ({
  withParent: (fn: (parent: { id: string }) => Promise<Response>) =>
    fn({ id: "parent-user-id" }),
}));

import { AuthorizationError } from "@lumi/profiles/domain";

type ConsentRoute = {
  GET?: (request: Request) => Promise<Response>;
  POST?: (request: Request) => Promise<Response>;
};

type IdRoute = {
  POST?: (
    request: Request,
    ctx: { params: Promise<{ id: string }> },
  ) => Promise<Response>;
};

const HOUSEHOLD_ID = "h1";
const CHILD_ID = "child-1";

function makeRequest(url: string, options: RequestInit = {}): Request {
  return new Request(url, {
    headers: { "content-type": "application/json" },
    ...options,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("S18-T05 - Privacy Consent API", () => {
  describe("GET /api/privacy/consent", () => {
    it("returns 400 when householdId is missing", async () => {
      const route = (await import("@/app/api/privacy/consent/route")) as ConsentRoute;
      const res = await route.GET!(makeRequest("http://localhost/api/privacy/consent"));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("VALIDATION_ERROR");
    });

    it("returns 403 for cross-family access", async () => {
      mockListConsents.mockRejectedValueOnce(
        new AuthorizationError("User is not a member of this household"),
      );

      const route = (await import("@/app/api/privacy/consent/route")) as ConsentRoute;
      const res = await route.GET!(
        makeRequest(
          `http://localhost/api/privacy/consent?householdId=${HOUSEHOLD_ID}`,
        ),
      );
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("FORBIDDEN");
    });

    it("returns consents for a valid household member", async () => {
      mockListConsents.mockResolvedValueOnce([
        {
          id: "c1",
          householdId: HOUSEHOLD_ID,
          childProfileId: null,
          consentType: "data_processing",
          status: "granted",
          grantedAt: new Date(),
          revokedAt: null,
          grantedBy: "parent-user-id",
        },
      ]);

      const route = (await import("@/app/api/privacy/consent/route")) as ConsentRoute;
      const res = await route.GET!(
        makeRequest(
          `http://localhost/api/privacy/consent?householdId=${HOUSEHOLD_ID}`,
        ),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.consents).toHaveLength(1);
      expect(body.consents[0].consentType).toBe("data_processing");
    });

    it("passes childProfileId to the child-scoped list", async () => {
      mockListConsentsForChild.mockResolvedValueOnce([]);

      const route = (await import("@/app/api/privacy/consent/route")) as ConsentRoute;
      const res = await route.GET!(
        makeRequest(
          `http://localhost/api/privacy/consent?householdId=${HOUSEHOLD_ID}&childProfileId=${CHILD_ID}`,
        ),
      );
      expect(res.status).toBe(200);
      expect(mockListConsentsForChild).toHaveBeenCalledWith(
        "parent-user-id",
        HOUSEHOLD_ID,
        CHILD_ID,
      );
    });
  });

  describe("POST /api/privacy/consent", () => {
    it("returns 400 when consentType is missing", async () => {
      const route = (await import("@/app/api/privacy/consent/route")) as ConsentRoute;
      const res = await route.POST!(
        makeRequest("http://localhost/api/privacy/consent", {
          method: "POST",
          body: JSON.stringify({ householdId: HOUSEHOLD_ID }),
        }),
      );
      expect(res.status).toBe(400);
    });

    it("returns 403 for cross-family access", async () => {
      mockGrantConsent.mockRejectedValueOnce(
        new AuthorizationError("User is not a member of this household"),
      );

      const route = (await import("@/app/api/privacy/consent/route")) as ConsentRoute;
      const res = await route.POST!(
        makeRequest("http://localhost/api/privacy/consent", {
          method: "POST",
          body: JSON.stringify({
            householdId: HOUSEHOLD_ID,
            consentType: "data_processing",
          }),
        }),
      );
      expect(res.status).toBe(403);
    });

    it("returns 400 for an unknown consent type", async () => {
      mockGrantConsent.mockRejectedValueOnce(
        new Error("INVALID_CONSENT_TYPE Unknown consent type 'spying'"),
      );

      const route = (await import("@/app/api/privacy/consent/route")) as ConsentRoute;
      const res = await route.POST!(
        makeRequest("http://localhost/api/privacy/consent", {
          method: "POST",
          body: JSON.stringify({
            householdId: HOUSEHOLD_ID,
            consentType: "spying",
          }),
        }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("VALIDATION_ERROR");
    });

    it("grants a consent and returns 201", async () => {
      mockGrantConsent.mockResolvedValueOnce({
        id: "c1",
        householdId: HOUSEHOLD_ID,
        childProfileId: CHILD_ID,
        consentType: "media_generation",
        status: "granted",
        grantedAt: new Date(),
        revokedAt: null,
        grantedBy: "parent-user-id",
      });

      const route = (await import("@/app/api/privacy/consent/route")) as ConsentRoute;
      const res = await route.POST!(
        makeRequest("http://localhost/api/privacy/consent", {
          method: "POST",
          body: JSON.stringify({
            householdId: HOUSEHOLD_ID,
            childProfileId: CHILD_ID,
            consentType: "media_generation",
          }),
        }),
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.consent.status).toBe("granted");
    });
  });

  describe("POST /api/privacy/consent/[id]", () => {
    it("returns 404 for a consent outside the household", async () => {
      mockRevokeConsent.mockRejectedValueOnce(
        new Error("NOT_FOUND ConsentRecord with id 'c99' not found"),
      );

      const route = (await import(
        "@/app/api/privacy/consent/[id]/route"
      )) as IdRoute;
      const res = await route.POST!(
        makeRequest(
          `http://localhost/api/privacy/consent/c99?householdId=${HOUSEHOLD_ID}`,
          { method: "POST" },
        ),
        { params: Promise.resolve({ id: "c99" }) },
      );
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe("NOT_FOUND");
    });

    it("returns 403 for cross-family revoke", async () => {
      mockRevokeConsent.mockRejectedValueOnce(
        new AuthorizationError("User is not a member of this household"),
      );

      const route = (await import(
        "@/app/api/privacy/consent/[id]/route"
      )) as IdRoute;
      const res = await route.POST!(
        makeRequest(
          `http://localhost/api/privacy/consent/c1?householdId=${HOUSEHOLD_ID}`,
          { method: "POST" },
        ),
        { params: Promise.resolve({ id: "c1" }) },
      );
      expect(res.status).toBe(403);
    });

    it("revokes a consent", async () => {
      mockRevokeConsent.mockResolvedValueOnce({
        id: "c1",
        householdId: HOUSEHOLD_ID,
        childProfileId: null,
        consentType: "data_processing",
        status: "revoked",
        grantedAt: new Date(),
        revokedAt: new Date(),
        grantedBy: "parent-user-id",
      });

      const route = (await import(
        "@/app/api/privacy/consent/[id]/route"
      )) as IdRoute;
      const res = await route.POST!(
        makeRequest(
          `http://localhost/api/privacy/consent/c1?householdId=${HOUSEHOLD_ID}`,
          { method: "POST" },
        ),
        { params: Promise.resolve({ id: "c1" }) },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.consent.status).toBe("revoked");
    });
  });
});

describe("S18-T05 - Privacy Export API", () => {
  type ExportRoute = {
    GET?: (request: Request) => Promise<Response>;
    POST?: (request: Request) => Promise<Response>;
  };

  it("POST requires childProfileId", async () => {
    const route = (await import("@/app/api/privacy/export/route")) as ExportRoute;
    const res = await route.POST!(
      makeRequest("http://localhost/api/privacy/export", {
        method: "POST",
        body: JSON.stringify({ householdId: HOUSEHOLD_ID }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("POST returns 403 for cross-family access", async () => {
    mockExportChildData.mockRejectedValueOnce(
      new AuthorizationError("User is not a member of this household"),
    );

    const route = (await import("@/app/api/privacy/export/route")) as ExportRoute;
    const res = await route.POST!(
      makeRequest("http://localhost/api/privacy/export", {
        method: "POST",
        body: JSON.stringify({
          householdId: HOUSEHOLD_ID,
          childProfileId: CHILD_ID,
        }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("POST generates an export record", async () => {
    mockExportChildData.mockResolvedValueOnce({
      id: "e1",
      householdId: HOUSEHOLD_ID,
      childProfileId: CHILD_ID,
      exportFormat: "lumi-child-v1",
      status: "generated",
      payload: {
        exportFormat: "lumi-child-v1",
        childProfile: { id: CHILD_ID, displayName: "Test" },
        characters: [],
        storySessions: [],
      },
      createdAt: new Date(),
    });

    const route = (await import("@/app/api/privacy/export/route")) as ExportRoute;
    const res = await route.POST!(
      makeRequest("http://localhost/api/privacy/export", {
        method: "POST",
        body: JSON.stringify({
          householdId: HOUSEHOLD_ID,
          childProfileId: CHILD_ID,
        }),
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.export.status).toBe("generated");
    expect(mockExportChildData).toHaveBeenCalledWith(
      "parent-user-id",
      HOUSEHOLD_ID,
      CHILD_ID,
    );
  });

  it("GET returns 400 without childProfileId", async () => {
    const route = (await import("@/app/api/privacy/export/route")) as ExportRoute;
    const res = await route.GET!(
      makeRequest(`http://localhost/api/privacy/export?householdId=${HOUSEHOLD_ID}`),
    );
    expect(res.status).toBe(400);
  });
});

describe("S18-T05 - Privacy Archive and Audit API", () => {
  type ArchiveRoute = { POST?: (request: Request) => Promise<Response> };
  type AuditRoute = { GET?: (request: Request) => Promise<Response> };

  it("POST archive returns 403 for cross-family access", async () => {
    mockArchiveChildData.mockRejectedValueOnce(
      new AuthorizationError("User is not a member of this household"),
    );

    const route = (await import("@/app/api/privacy/archive/route")) as ArchiveRoute;
    const res = await route.POST!(
      makeRequest("http://localhost/api/privacy/archive", {
        method: "POST",
        body: JSON.stringify({
          householdId: HOUSEHOLD_ID,
          childProfileId: CHILD_ID,
        }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("POST archive archives child data", async () => {
    mockArchiveChildData.mockResolvedValueOnce({
      childProfileId: CHILD_ID,
      householdId: HOUSEHOLD_ID,
      archivedCharacters: 1,
      archivedWorlds: 1,
    });

    const route = (await import("@/app/api/privacy/archive/route")) as ArchiveRoute;
    const res = await route.POST!(
      makeRequest("http://localhost/api/privacy/archive", {
        method: "POST",
        body: JSON.stringify({
          householdId: HOUSEHOLD_ID,
          childProfileId: CHILD_ID,
        }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.archived.archivedCharacters).toBe(1);
  });

  it("GET audit returns 403 for cross-family access", async () => {
    mockGetAuditTrail.mockRejectedValueOnce(
      new AuthorizationError("User is not a member of this household"),
    );

    const route = (await import("@/app/api/privacy/audit/route")) as AuditRoute;
    const res = await route.GET!(
      makeRequest(`http://localhost/api/privacy/audit?householdId=${HOUSEHOLD_ID}`),
    );
    expect(res.status).toBe(403);
  });

  it("GET audit returns lifecycle entries", async () => {
    mockGetAuditTrail.mockResolvedValueOnce([
      {
        id: "a1",
        householdId: HOUSEHOLD_ID,
        actorId: "parent-user-id",
        action: "consent.grant",
        subjectType: "child_profile",
        subjectId: CHILD_ID,
        beforeState: {},
        afterState: { consentType: "data_processing" },
        createdAt: new Date(),
      },
    ]);

    const route = (await import("@/app/api/privacy/audit/route")) as AuditRoute;
    const res = await route.GET!(
      makeRequest(`http://localhost/api/privacy/audit?householdId=${HOUSEHOLD_ID}`),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.entries[0].action).toBe("consent.grant");
  });
});
