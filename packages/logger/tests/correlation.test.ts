import { describe, expect, it } from "vitest";

import {
  generateCorrelationId,
  isValidCorrelationId,
  withCorrelation,
  getCorrelationId,
} from "../src/correlation";

describe("generateCorrelationId", () => {
  it("generates a valid UUID v4", () => {
    const id = generateCorrelationId();
    expect(isValidCorrelationId(id)).toBe(true);
  });

  it("generates unique values", () => {
    const ids = Array.from({ length: 100 }, () => generateCorrelationId());
    const unique = new Set(ids);
    expect(unique.size).toBe(100);
  });
});

describe("isValidCorrelationId", () => {
  it("accepts a valid UUID v4", () => {
    expect(isValidCorrelationId("550e8400-e29b-41d4-a716-446655440000")).toBe(
      true,
    );
  });

  it("rejects short strings", () => {
    expect(isValidCorrelationId("short")).toBe(false);
  });

  it("rejects long strings", () => {
    expect(isValidCorrelationId("x".repeat(200))).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isValidCorrelationId(undefined as unknown as string)).toBe(false);
    expect(isValidCorrelationId(null as unknown as string)).toBe(false);
    expect(isValidCorrelationId(123 as unknown as string)).toBe(false);
  });

  it("rejects non-UUID format", () => {
    expect(isValidCorrelationId("not-a-uuid-at-all")).toBe(false);
  });
});

describe("withCorrelation and getCorrelationId", () => {
  it("sets and retrieves correlation ID within scope", () => {
    withCorrelation("corr-test-123", () => {
      expect(getCorrelationId()).toBe("corr-test-123");
    });
  });

  it("returns undefined outside of correlation scope", () => {
    expect(getCorrelationId()).toBeUndefined();
  });

  it("supports nested correlation scopes", () => {
    withCorrelation("outer", () => {
      expect(getCorrelationId()).toBe("outer");

      withCorrelation("inner", () => {
        expect(getCorrelationId()).toBe("inner");
      });

      expect(getCorrelationId()).toBe("outer");
    });
  });

  it("propagates correlation to async functions", async () => {
    const result = await withCorrelation("async-test", async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return getCorrelationId();
    });

    expect(result).toBe("async-test");
  });
});
