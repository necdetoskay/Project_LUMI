import { describe, expect, it } from "vitest";

import {
  CHARACTER_GENESIS_QUALITY_RUBRIC_V1,
  calculateOverallScore,
} from "../src/test-lab/domain";

describe("Character Genesis qualification rubric", () => {
  it("contains the full Genesis quality surface and weights future-story yield", () => {
    const keys = CHARACTER_GENESIS_QUALITY_RUBRIC_V1.criteria.map(
      (criterion) => criterion.key,
    );

    expect(keys).toEqual([
      "coherence",
      "age_suitability",
      "character_specificity",
      "world_consistency",
      "past_life_believability",
      "trait_evidence",
      "relationship_depth",
      "item_integration",
      "memory_quality",
      "open_thread_quality",
      "future_story_yield",
      "redundancy",
      "contradiction_rate",
    ]);
    expect(
      CHARACTER_GENESIS_QUALITY_RUBRIC_V1.criteria.find(
        (criterion) => criterion.key === "future_story_yield",
      )?.weight,
    ).toBeGreaterThan(1);
  });

  it("lets future-story yield meaningfully affect candidate comparison", () => {
    const baseFindings = CHARACTER_GENESIS_QUALITY_RUBRIC_V1.criteria.map(
      (criterion) => ({
        criterionKey: criterion.key,
        score: 7,
        finding: "baseline",
        evidence: null,
      }),
    );
    const highYield = baseFindings.map((finding) =>
      finding.criterionKey === "future_story_yield"
        ? { ...finding, score: 10 }
        : finding,
    );
    const lowYield = baseFindings.map((finding) =>
      finding.criterionKey === "future_story_yield"
        ? { ...finding, score: 3 }
        : finding,
    );

    expect(
      calculateOverallScore(CHARACTER_GENESIS_QUALITY_RUBRIC_V1, highYield),
    ).toBeGreaterThan(
      calculateOverallScore(CHARACTER_GENESIS_QUALITY_RUBRIC_V1, lowYield),
    );
  });
});
