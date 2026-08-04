import { describe, expect, it } from "vitest";

import { redact } from "../src/redact";

function r(value: Record<string, unknown>): Record<string, unknown> {
  return redact(value) as Record<string, unknown>;
}

function rArray(value: unknown[]): unknown[] {
  return redact(value) as unknown[];
}

describe("redact", () => {
  it("redacts password fields", () => {
    const result = r({ password: "supersecret123", name: "test" });
    expect(result).toEqual({ password: "[REDACTED]", name: "test" });
  });

  it("redacts token fields", () => {
    const result = r({
      accessToken: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0",
      refresh_token: "rtoken123",
      name: "test",
    });
    expect(result.accessToken).toBe("[REDACTED]");
    expect(result.refresh_token).toBe("[REDACTED]");
  });

  it("redacts nested secret fields", () => {
    const result = r({
      config: { apiSecret: "sk-1234", dbPassword: "pgpass" },
      nested: { secretKey: "enc-key" },
    });
    expect(result.config).toEqual({
      apiSecret: "[REDACTED]",
      dbPassword: "[REDACTED]",
    });
    expect(result.nested).toEqual({
      secretKey: "[REDACTED]",
    });
  });

  it("redacts cookie and session fields", () => {
    const result = r({
      cookie: "session=abc123",
      sessionId: "sess-456",
      name: "test",
    });
    expect(result.cookie).toBe("[REDACTED]");
    expect(result.sessionId).toBe("[REDACTED]");
  });

  it("redacts authorization header", () => {
    const result = r({
      authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.token",
      name: "test",
    });
    expect(result.authorization).toBe("[REDACTED]");
  });

  it("redacts prompt and story content", () => {
    const result = r({
      prompt: "Generate a story about...",
      storyContent: "Once upon a time...",
      name: "test",
    });
    expect(result.prompt).toBe("[REDACTED]");
    expect(result.storyContent).toBe("[REDACTED]");
  });

  it("redacts email fields", () => {
    const result = r({ email: "parent@example.com" });
    expect(result.email).toBe("[REDACTED]");
  });

  it("redacts child personal data", () => {
    const result = r({
      childName: "Minik",
      childDob: "2020-01-15",
      safeField: "hello",
    });
    expect(result.childName).toBe("[REDACTED]");
    expect(result.childDob).toBe("[REDACTED]");
  });

  it("allows hashed values through with allowlist", () => {
    const result = redact(
      { emailHash: "a1b2c3d4e5f6", clientIpHash: "192.168.1.1" },
      { allowlist: ["emailHash", "clientIpHash"] },
    ) as Record<string, unknown>;
    expect(result.emailHash).toBe("a1b2c3d4e5f6");
    expect(result.clientIpHash).toBe("192.168.1.1");
  });

  it("preserves non-sensitive fields", () => {
    const result = r({
      event: "auth.login",
      parentId: "parent-123",
      displayName: "Lumi Parent",
      timestamp: "2026-07-28T00:00:00.000Z",
    });
    expect(result.event).toBe("auth.login");
    expect(result.parentId).toBe("parent-123");
    expect(result.displayName).toBe("Lumi Parent");
    expect(result.timestamp).toBe("2026-07-28T00:00:00.000Z");
  });

  it("handles null and undefined values", () => {
    const result = r({ password: null, token: undefined, name: "test" });
    expect(result.password).toBe("[REDACTED]");
    expect(result.token).toBe("[REDACTED]");
    expect(result.name).toBe("test");
  });

  it("redacts arrays of objects", () => {
    const result = rArray([
      { password: "secret1", name: "a" },
      { password: "secret2", name: "b" },
    ]);
    expect(result).toEqual([
      { password: "[REDACTED]", name: "a" },
      { password: "[REDACTED]", name: "b" },
    ]);
  });

  it("uses custom placeholder", () => {
    const result = redact(
      { password: "secret" },
      { placeholder: "***" },
    ) as Record<string, unknown>;
    expect(result.password).toBe("***");
  });

  it("uses custom denylist", () => {
    const result = redact(
      { apiKey: "abc123", name: "test" },
      { denylist: ["apiKey"] },
    ) as Record<string, unknown>;
    expect(result.apiKey).toBe("[REDACTED]");
    expect(result.name).toBe("test");
  });
});
