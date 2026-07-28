import { beforeEach, describe, expect, it, vi } from "vitest";

const fixedExpiry = new Date("2026-07-27T12:00:00.000Z");
const mockQuery = vi.fn();
const mockRelease = vi.fn();
const mockConnect = vi.fn(async () => ({
  query: mockQuery,
  release: mockRelease,
}));

vi.mock("@node-rs/argon2", () => ({
  hash: vi.fn(),
  verify: vi.fn(),
}));

vi.mock("@/lib/auth/database", () => ({
  getAuthPool: () => ({
    connect: mockConnect,
    query: mockQuery,
  }),
}));

vi.mock("@/lib/auth/tokens", () => ({
  createPasswordResetToken: vi.fn(() => "reset-token-preview-value"),
  createSessionToken: vi.fn(() => "rotated-session-token"),
  getPasswordResetExpiry: vi.fn(() => fixedExpiry),
  getSessionExpiry: vi.fn(() => fixedExpiry),
  hashPasswordResetToken: vi.fn((token: string) => `reset-hash:${token}`),
  hashSessionToken: vi.fn((token: string) => `hash:${token}`),
}));

import { buildAuthAuditEvent } from "@/lib/auth/audit";
import { checkAuthRateLimit, resetAuthRateLimitStore } from "@/lib/auth/rate-limit";
import {
  getParentFromSessionToken,
  loginParent,
  loginParentSchema,
  refreshParentSession,
  registerParent,
  registerParentSchema,
  requestPasswordReset,
  resetParentPassword,
  resetPasswordSchema,
  revokeParentSession,
} from "@/lib/auth/service";
import { createSessionToken, hashSessionToken } from "@/lib/auth/tokens";
import { readRequestBody } from "@/lib/http/request-body";

describe("auth token helpers", () => {
  it("creates opaque session tokens and stable hashes", () => {
    const token = createSessionToken();

    expect(token.length).toBeGreaterThan(20);
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
    expect(hashSessionToken(token)).not.toBe(token);
  });
});

describe("request body reader", () => {
  it("reads JSON request bodies", async () => {
    const request = new Request("http://localhost/api/auth/login", {
      body: JSON.stringify({ email: "parent@example.com" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    await expect(readRequestBody(request)).resolves.toEqual({
      email: "parent@example.com",
    });
  });

  it("reads form request bodies", async () => {
    const body = new URLSearchParams({ email: "parent@example.com" });
    const request = new Request("http://localhost/api/auth/login", {
      body,
      method: "POST",
    });

    await expect(readRequestBody(request)).resolves.toEqual({
      email: "parent@example.com",
    });
  });
});

describe("auth schemas", () => {
  it("requires matching register passwords", () => {
    expect(() =>
      registerParentSchema.parse({
        confirmPassword: "different-secret",
        displayName: "Lumi Parent",
        email: "parent@example.com",
        password: "very-secret-password",
      }),
    ).toThrow("PASSWORD_MISMATCH");
  });

  it("parses remember-me values from browser forms", () => {
    const result = loginParentSchema.parse({
      email: "parent@example.com",
      password: "very-secret-password",
      rememberMe: "on",
    });

    expect(result.rememberMe).toBe(true);
  });

  it("requires matching reset passwords", () => {
    expect(() =>
      resetPasswordSchema.parse({
        confirmPassword: "different-secret",
        password: "very-secret-password",
        token: "reset-token-preview-value",
      }),
    ).toThrow("PASSWORD_MISMATCH");
  });
});

describe("auth audit logging", () => {
  it("redacts client identifiers into hashes", () => {
    const event = buildAuthAuditEvent({
      action: "login",
      clientIp: "203.0.113.20",
      email: "parent@example.com",
      outcome: "failed",
      reason: "INVALID_CREDENTIALS",
    });

    expect(event.clientIpHash).not.toContain("203.0.113.20");
    expect(event.emailHash).not.toContain("parent@example.com");
    expect(JSON.stringify(event)).not.toContain("parent@example.com");
    expect(event.event).toBe("auth.audit");
  });
});

describe("auth rate limiting", () => {
  beforeEach(() => {
    resetAuthRateLimitStore();
  });

  it("blocks requests that exceed the configured window budget", () => {
    const identifier = "203.0.113.20:parent@example.com";
    const startedAt = Date.UTC(2026, 6, 27, 10, 0, 0);

    const attempts = Array.from({ length: 6 }, (_, index) =>
      checkAuthRateLimit("login", identifier, startedAt + index),
    );

    expect(attempts[4]).toMatchObject({ allowed: true, remaining: 0 });
    expect(attempts[5]).toMatchObject({ allowed: false, remaining: 0 });
    expect(attempts[5]?.retryAfterSeconds).toBeGreaterThan(0);
  });
});

describe("refreshParentSession", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockRelease.mockReset();
    mockConnect.mockClear();
  });

  it("rotates the refresh session inside the same session family", async () => {
    mockQuery.mockImplementation(async (query: string, values?: unknown[]) => {
      if (query === "BEGIN" || query === "COMMIT" || query === "ROLLBACK") {
        return { rows: [] };
      }

      if (query.includes("FROM parent_sessions s")) {
        return {
          rows: [
            {
              expires_at: new Date("2026-08-27T12:00:00.000Z"),
              parent_account_id: "parent-1",
              parent_display_name: "Lumi Parent",
              parent_email: "parent@example.com",
              parent_id: "parent-1",
              remember_me: true,
              replaced_by_session_id: null,
              revoked_at: null,
              session_family_id: "family-1",
              session_id: "session-1",
            },
          ],
        };
      }

      if (query.includes("INSERT INTO parent_sessions")) {
        return {
          rows: [
            {
              expires_at: fixedExpiry,
              id: "session-2",
              remember_me: true,
              session_family_id: "family-1",
            },
          ],
        };
      }

      if (query.includes("UPDATE parent_sessions") && query.includes("WHERE id = $1")) {
        expect(values).toEqual(["session-1", "session-2"]);
        return { rows: [] };
      }

      throw new Error(`Unexpected query: ${query}`);
    });

    const result = await refreshParentSession("current-session-token");

    expect(result.parent).toEqual({
      displayName: "Lumi Parent",
      email: "parent@example.com",
      id: "parent-1",
    });
    expect(result.session).toEqual({
      expiresAt: fixedExpiry,
      id: "session-2",
      rememberMe: true,
      sessionFamilyId: "family-1",
      token: "rotated-session-token",
    });

    const insertCall = mockQuery.mock.calls.find(([query]) =>
      String(query).includes("INSERT INTO parent_sessions"),
    );

    expect(insertCall?.[1]).toEqual([
      "parent-1",
      "hash:rotated-session-token",
      fixedExpiry,
      "family-1",
      true,
    ]);
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it("rejects a missing session token before opening a transaction", async () => {
    await expect(refreshParentSession(undefined)).rejects.toThrow("INVALID_SESSION");
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it("rejects an unknown session and rolls the transaction back", async () => {
    mockQuery.mockImplementation(async (query: string) => {
      if (query === "BEGIN" || query === "COMMIT" || query === "ROLLBACK") {
        return { rows: [] };
      }

      if (query.includes("FROM parent_sessions s")) {
        return { rows: [] };
      }

      throw new Error(`Unexpected query: ${query}`);
    });

    await expect(refreshParentSession("missing-session-token")).rejects.toThrow(
      "INVALID_SESSION",
    );

    expect(
      mockQuery.mock.calls.some(([query]) => String(query) === "ROLLBACK"),
    ).toBe(true);
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it("revokes the whole session family when a reused refresh token appears", async () => {
    mockQuery.mockImplementation(async (query: string, values?: unknown[]) => {
      if (query === "BEGIN" || query === "COMMIT" || query === "ROLLBACK") {
        return { rows: [] };
      }

      if (query.includes("FROM parent_sessions s")) {
        return {
          rows: [
            {
              expires_at: new Date("2026-08-27T12:00:00.000Z"),
              parent_account_id: "parent-1",
              parent_display_name: "Lumi Parent",
              parent_email: "parent@example.com",
              parent_id: "parent-1",
              remember_me: true,
              replaced_by_session_id: "session-2",
              revoked_at: new Date("2026-07-27T12:05:00.000Z"),
              session_family_id: "family-1",
              session_id: "session-1",
            },
          ],
        };
      }

      if (query.includes("WHERE session_family_id = $1")) {
        expect(values).toEqual(["family-1", null]);
        return { rows: [] };
      }

      throw new Error(`Unexpected query: ${query}`);
    });

    await expect(refreshParentSession("reused-session-token")).rejects.toThrow(
      "REUSED_SESSION",
    );

    expect(
      mockQuery.mock.calls.some(([query]) =>
        String(query).includes("WHERE session_family_id = $1"),
      ),
    ).toBe(true);
    expect(
      mockQuery.mock.calls.some(([query]) => String(query) === "COMMIT"),
    ).toBe(true);
    expect(
      mockQuery.mock.calls.some(([query]) => String(query) === "ROLLBACK"),
    ).toBe(false);
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });
});

describe("registerParent", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockRelease.mockReset();
    mockConnect.mockClear();
  });

  it("rejects duplicate email registration with PARENT_EMAIL_ALREADY_EXISTS", async () => {
    mockQuery.mockImplementation(async () => {
      const pgError = new Error("duplicate key") as Error & { code: string };
      pgError.code = "23505";
      throw pgError;
    });

    await expect(
      registerParent({
        confirmPassword: "very-secret-password",
        displayName: "Lumi Parent",
        email: "parent@example.com",
        password: "very-secret-password",
      }),
    ).rejects.toThrow("PARENT_EMAIL_ALREADY_EXISTS");
  });
});

describe("loginParent", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockRelease.mockReset();
    mockConnect.mockClear();
  });

  it("rejects login with non-existent email as INVALID_CREDENTIALS", async () => {
    const { verify } = await import("@node-rs/argon2");
    vi.mocked(verify).mockResolvedValue(true);

    mockQuery.mockResolvedValue({ rows: [] });

    await expect(
      loginParent({
        email: "nonexistent@example.com",
        password: "very-secret-password",
        rememberMe: false,
      }),
    ).rejects.toThrow("INVALID_CREDENTIALS");
  });

  it("rejects login with wrong password as INVALID_CREDENTIALS", async () => {
    const { verify } = await import("@node-rs/argon2");
    vi.mocked(verify).mockResolvedValue(false);

    mockQuery.mockResolvedValue({
      rows: [
        {
          id: "parent-1",
          email: "parent@example.com",
          display_name: "Lumi Parent",
          password_hash: "hash:stored-password",
        },
      ],
    });

    await expect(
      loginParent({
        email: "parent@example.com",
        password: "wrong-password",
        rememberMe: false,
      }),
    ).rejects.toThrow("INVALID_CREDENTIALS");
  });
});

describe("getParentFromSessionToken", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it("returns null when no token is provided", async () => {
    await expect(getParentFromSessionToken(undefined)).resolves.toBeNull();
  });

  it("returns null when session is expired", async () => {
    const pastDate = new Date("2020-01-01T00:00:00.000Z");
    mockQuery.mockResolvedValue({
      rows: [
        {
          session_id: "session-1",
          parent_id: "parent-1",
          session_family_id: "family-1",
          remember_me: true,
          expires_at: pastDate,
          revoked_at: null,
          replaced_by_session_id: null,
          parent_account_id: "parent-1",
          parent_email: "parent@example.com",
          parent_display_name: "Lumi Parent",
        },
      ],
    });

    const result = await getParentFromSessionToken("expired-token");
    expect(result).toBeNull();
  });

  it("returns null when session is revoked", async () => {
    const futureDate = new Date("2030-01-01T00:00:00.000Z");
    mockQuery.mockResolvedValue({
      rows: [
        {
          session_id: "session-1",
          parent_id: "parent-1",
          session_family_id: "family-1",
          remember_me: true,
          expires_at: futureDate,
          revoked_at: new Date("2026-07-27T12:00:00.000Z"),
          replaced_by_session_id: null,
          parent_account_id: "parent-1",
          parent_email: "parent@example.com",
          parent_display_name: "Lumi Parent",
        },
      ],
    });

    const result = await getParentFromSessionToken("revoked-token");
    expect(result).toBeNull();
  });
});

describe("revokeParentSession", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it("does nothing when no token is provided", async () => {
    await revokeParentSession(undefined);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("executes update query when token is provided", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await revokeParentSession("valid-session-token");

    expect(mockQuery).toHaveBeenCalledOnce();
  });
});

describe("requestPasswordReset", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it("returns null previewToken for non-existent email", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const result = await requestPasswordReset({ email: "unknown@example.com" });

    expect(result.previewToken).toBeNull();
    expect(result.email).toBe("unknown@example.com");
  });
});

describe("resetParentPassword", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockRelease.mockReset();
    mockConnect.mockClear();
  });

  it("rejects reset with invalid token as INVALID_RESET_TOKEN", async () => {
    mockConnect.mockResolvedValue({
      query: mockQuery,
      release: mockRelease,
    });

    mockQuery.mockImplementation(async (query: string) => {
      if (query === "BEGIN" || query === "COMMIT" || query === "ROLLBACK") {
        return { rows: [] };
      }

      return { rows: [] };
    });

    await expect(
      resetParentPassword({
        confirmPassword: "new-password-here",
        password: "new-password-here",
        token: "nonexistent-reset-token-value-here",
      }),
    ).rejects.toThrow("INVALID_RESET_TOKEN");

    expect(
      mockQuery.mock.calls.some(([q]) => String(q) === "ROLLBACK"),
    ).toBe(true);
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });
});
