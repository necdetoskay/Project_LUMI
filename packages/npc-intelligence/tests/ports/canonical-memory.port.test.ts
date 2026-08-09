import { describe, expect, it } from "vitest";

import {
  DEFAULT_MEMORY_RETRIEVAL_LIMIT,
  MAX_MEMORY_RETRIEVAL_LIMIT,
  normalizeMemoryRetrievalLimit,
} from "../../src/ports/canonical-memory.port";

describe("canonical memory retrieval limits", () => {
  it("uses the bounded default when limit is omitted", () => {
    expect(normalizeMemoryRetrievalLimit()).toBe(DEFAULT_MEMORY_RETRIEVAL_LIMIT);
  });

  it("accepts a smaller positive integer", () => {
    expect(normalizeMemoryRetrievalLimit(5)).toBe(5);
  });

  it("caps oversized requests at the hard maximum", () => {
    expect(normalizeMemoryRetrievalLimit(MAX_MEMORY_RETRIEVAL_LIMIT + 100)).toBe(
      MAX_MEMORY_RETRIEVAL_LIMIT,
    );
  });

  it.each([0, -1, 1.5, Number.NaN])("rejects invalid limit %s", (value) => {
    expect(() => normalizeMemoryRetrievalLimit(value)).toThrow(
      "memory retrieval limit must be a positive integer",
    );
  });
});
