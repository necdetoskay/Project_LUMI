import { describe, expect, it } from "vitest";
import {
  MAX_RETRIEVAL_LIMIT,
  normalizeRetrievalCandidates,
  normalizeRetrievalLimit,
  type RetrievalCandidate,
} from "../../src/ports";

describe("retrieval contracts", () => {
  it("bounds retrieval limits so callers cannot request full history", () => {
    expect(normalizeRetrievalLimit(0)).toBe(1);
    expect(normalizeRetrievalLimit(8.9)).toBe(8);
    expect(normalizeRetrievalLimit(Number.POSITIVE_INFINITY)).toBe(1);
    expect(normalizeRetrievalLimit(999)).toBe(MAX_RETRIEVAL_LIMIT);
  });

  it("deduplicates stable identities and keeps the most relevant candidate", () => {
    const candidates: RetrievalCandidate[] = [
      candidate("memory:1", 0.4),
      candidate("memory:1", 0.9),
      candidate("event:2", 0.7),
    ];

    expect(normalizeRetrievalCandidates(candidates, 10).map((item) => item.stableId)).toEqual([
      "memory:1",
      "event:2",
    ]);
    expect(normalizeRetrievalCandidates(candidates, 10)[0]?.relevance).toBe(0.9);
  });

  it("clamps relevance, drops invalid candidates and returns deterministic ordering", () => {
    const candidates: RetrievalCandidate[] = [
      candidate("z", 2),
      candidate("a", 1),
      candidate("bad", Number.NaN),
      candidate("", 0.8),
    ];

    expect(normalizeRetrievalCandidates(candidates, 2)).toMatchObject([
      { stableId: "a", relevance: 1 },
      { stableId: "z", relevance: 1 },
    ]);
  });
});

function candidate(stableId: string, relevance: number): RetrievalCandidate {
  return {
    stableId,
    relevance,
    summary: stableId,
    payload: {},
    provenance: {
      sourceKind: "memory",
      sourceId: stableId,
      authority: "test",
    },
  };
}
