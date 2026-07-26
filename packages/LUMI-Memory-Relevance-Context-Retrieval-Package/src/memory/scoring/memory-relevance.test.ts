import { describe, expect, it } from "vitest";
import { calculateMemoryRelevance } from "./memory-relevance";

describe("memory relevance", () => {
  it("weights multiple relevance dimensions", () => {
    const result =
      calculateMemoryRelevance({
        semanticScore: 1,
        subjectScore: 1,
        recencyScore: 1,
        importance: 1,
        emotionalSalience: 1,
        consequenceWeight: 1,
      });

    expect(result).toBe(1);
  });
});
