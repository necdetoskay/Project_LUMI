import { describe, expect, it } from "vitest";

import { safeError } from "../src/safe-error";

describe("safeError", () => {
  it("serializes an Error with message and name", () => {
    const result = safeError(new Error("something broke"));
    expect(result.message).toBe("something broke");
    expect(result.name).toBe("Error");
  });

  it("includes error code if present", () => {
    const err = new Error("db error") as Error & { code: string };
    err.code = "23505";
    const result = safeError(err);
    expect(result.code).toBe("23505");
  });

  it("handles null and undefined", () => {
    expect(safeError(null)).toEqual({ error: "unknown" });
    expect(safeError(undefined)).toEqual({ error: "unknown" });
  });

  it("handles string values", () => {
    const result = safeError("just a string error");
    expect(result.error).toBe("just a string error");
  });

  it("handles non-Error objects", () => {
    const result = safeError({ custom: "error" });
    expect(result.error).toBeDefined();
  });

  it("redacts postgresql:// URL from error message", () => {
    const err = new Error(
      "Connection failed: postgresql://user:pass@localhost:15432/lumi",
    );
    const result = safeError(err);
    const msg = result.message as string;
    expect(msg).not.toContain("postgresql://user:pass@");
    expect(msg).toContain("[REDACTED]");
  });

  it("redacts token value after 'token:' from error message", () => {
    const err = new Error(
      "Invalid token: eyJhbGciOiJIUzI1NiJ9.token-value-here",
    );
    const result = safeError(err);
    const msg = result.message as string;
    expect(msg).not.toContain("eyJhbGciOiJIUzI1NiJ9.token-value-here");
    expect(msg).toContain("[REDACTED]");
  });

  it("redacts password from error cause", () => {
    const cause = "Wrong password=supersecret123 for user admin";
    const err = new Error("auth failed", { cause });
    const result = safeError(err);
    expect((result.cause as string).toLowerCase()).not.toContain(
      "supersecret123",
    );
  });

  it("redacts secrets from error stack", () => {
    const err = new Error("something broke");
    err.stack = `Error: something broke
    at Object.<anonymous> (test.js:1:1)
    at connect (db.js:10:3)
    using DATABASE_URL=postgresql://user:pass@host:5432/db`;

    const result = safeError(err);
    const stackStr = result.stack as string;
    expect(stackStr.toLowerCase()).not.toContain("postgresql://");
    expect(stackStr.toLowerCase()).toContain("[redacted]");
  });

  it("redacts bearer tokens from error message", () => {
    const err = new Error("Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.dGVzdA");
    const result = safeError(err);
    expect((result.message as string).toLowerCase()).not.toContain(
      "bearer eyj",
    );
  });

  it("redacts sk- api keys from error message", () => {
    const err = new Error("Invalid API key: sk-abc123def456ghi789jkl");
    const result = safeError(err);
    expect((result.message as string).toLowerCase()).not.toContain("sk-abc123");
  });

  it("redacts cookie from error message", () => {
    const err = new Error(
      "Cookie parse error: cookie=session_id=abc123; secret=xyz",
    );
    const result = safeError(err);
    expect((result.message as string).toLowerCase()).not.toContain(
      "session_id=abc123",
    );
    expect(result.message as string).toContain("[REDACTED]");
  });
});
