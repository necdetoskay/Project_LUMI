import { describe, expect, it, vi } from "vitest";

import { createNoopMetricsAdapter, createSafeMetricsAdapter, validateLabels } from "../src/metrics";
import type { MetricsAdapter } from "../src/metrics";

describe("createNoopMetricsAdapter", () => {
  it("returns an adapter with all methods", () => {
    const adapter = createNoopMetricsAdapter();
    expect(adapter.incrementCounter).toBeDefined();
    expect(adapter.recordHistogram).toBeDefined();
    expect(adapter.recordError).toBeDefined();
  });

  it("no-op methods do not throw", () => {
    const adapter = createNoopMetricsAdapter();
    expect(() => adapter.incrementCounter("test")).not.toThrow();
    expect(() => adapter.recordHistogram("test", 100)).not.toThrow();
    expect(() => adapter.recordError("test")).not.toThrow();
  });
});

describe("createSafeMetricsAdapter", () => {
  it("forwards calls to underlying adapter when it works", () => {
    const mock: MetricsAdapter = {
      incrementCounter: vi.fn(),
      recordHistogram: vi.fn(),
      recordError: vi.fn(),
    };

    const safe = createSafeMetricsAdapter(mock);

    safe.incrementCounter("test", 1);
    safe.recordHistogram("latency", 200);
    safe.recordError("test.error");

    expect(mock.incrementCounter).toHaveBeenCalledWith("test", 1, undefined);
    expect(mock.recordHistogram).toHaveBeenCalledWith("latency", 200, undefined);
    expect(mock.recordError).toHaveBeenCalledWith("test.error", undefined);
  });

  it("does not throw when underlying adapter throws", () => {
    const throwing: MetricsAdapter = {
      incrementCounter: () => { throw new Error("adapter down"); },
      recordHistogram: () => { throw new Error("adapter down"); },
      recordError: () => { throw new Error("adapter down"); },
    };

    const safe = createSafeMetricsAdapter(throwing);

    expect(() => safe.incrementCounter("test")).not.toThrow();
    expect(() => safe.recordHistogram("test", 100)).not.toThrow();
    expect(() => safe.recordError("test")).not.toThrow();
  });

  it("does not break business flow", () => {
    const throwing: MetricsAdapter = {
      incrementCounter: () => { throw new Error("adapter down"); },
      recordHistogram: () => { throw new Error("adapter down"); },
      recordError: () => { throw new Error("adapter down"); },
    };

    const safe = createSafeMetricsAdapter(throwing);

    let businessFlowCompleted = false;
    safe.incrementCounter("request.count");
    safe.recordHistogram("request.latency", 100);
    safe.recordError("request.error");
    businessFlowCompleted = true;

    expect(businessFlowCompleted).toBe(true);
  });
});

describe("validateLabels", () => {
  it("strips high-cardinality labels", () => {
    const result = validateLabels({
      userId: "user-123",
      method: "GET",
      status: "200",
    });

    expect(result).toEqual({ method: "GET", status: "200" });
    expect(result).not.toHaveProperty("userId");
  });

  it("strips childId label", () => {
    const result = validateLabels({ childId: "child-456", method: "POST" });
    expect(result).toEqual({ method: "POST" });
  });

  it("strips email label", () => {
    const result = validateLabels({ email: "user@test.com" });
    expect(result).toBeUndefined();
  });

  it("strips profile and name labels", () => {
    const result = validateLabels({
      profileName: "test",
      profileAge: "8",
      method: "GET",
    });
    expect(result).toEqual({ method: "GET" });
  });

  it("strips session label", () => {
    const result = validateLabels({ sessionId: "sess-123", method: "GET" });
    expect(result).toEqual({ method: "GET" });
  });

  it("returns undefined for empty labels", () => {
    const result = validateLabels({ email: "user@test.com" });
    expect(result).toBeUndefined();
  });

  it("returns undefined for undefined input", () => {
    expect(validateLabels(undefined)).toBeUndefined();
  });

  it("filters labels with values longer than 128 chars", () => {
    const result = validateLabels({ method: "GET", long: "x".repeat(200) });
    expect(result).toEqual({ method: "GET" });
  });
});
