import { describe, expect, it } from "vitest";

import {
  calculateOriginQuality,
  passesQualityGates,
  analyzeMotifs,
  repeatedMotifRatio,
  MINIMUM_QUALITY_GATES,
} from "../../src/evals/quality-eval";
import {
  DIVERSE_ORIGIN_BATCH,
  GENERIC_ORIGIN_BATCH,
} from "./fixtures/origin-batches";

describe("calculateOriginQuality", () => {
  it("returns zero when child safety is below the hard gate", () => {
    const score = calculateOriginQuality({
      originality: 5,
      richness: 5,
      coherence: 5,
      childSafety: 4,
      emotionalWarmth: 5,
      storyPotential: 5,
      genericPenalty: 1,
    });
    expect(score).toBe(0);
  });

  it("scores a high-quality origin above a mediocre one", () => {
    const strong = calculateOriginQuality({
      originality: 5,
      richness: 5,
      coherence: 5,
      childSafety: 5,
      emotionalWarmth: 5,
      storyPotential: 5,
      genericPenalty: 1,
    });
    const weak = calculateOriginQuality({
      originality: 2,
      richness: 2,
      coherence: 2,
      childSafety: 5,
      emotionalWarmth: 2,
      storyPotential: 2,
      genericPenalty: 5,
    });
    expect(strong).toBeGreaterThan(weak);
  });
});

describe("passesQualityGates", () => {
  it("passes when all metrics meet minimums", () => {
    expect(
      passesQualityGates({
        originality: 4.2,
        richness: 4.1,
        coherence: 4.5,
        childSafety: 5,
        emotionalWarmth: 4,
        storyPotential: 4.3,
        genericPenalty: 1.5,
      }),
    ).toBe(true);
  });

  it("fails when child safety is below 5", () => {
    expect(
      passesQualityGates({
        originality: 5,
        richness: 5,
        coherence: 5,
        childSafety: 4,
        emotionalWarmth: 5,
        storyPotential: 5,
        genericPenalty: 1,
      }),
    ).toBe(false);
  });

  it("fails when the generic penalty is too high", () => {
    expect(
      passesQualityGates({
        originality: 4,
        richness: 4,
        coherence: 4,
        childSafety: 5,
        emotionalWarmth: 4,
        storyPotential: 4,
        genericPenalty: 3,
      }),
    ).toBe(false);
  });

  it("exposes the gate constants", () => {
    expect(MINIMUM_QUALITY_GATES.childSafety).toBe(5);
    expect(MINIMUM_QUALITY_GATES.repeatedMotifRatioMax).toBe(0.15);
  });
});

describe("analyzeMotifs", () => {
  it("reports a low repeated motif ratio for a diverse batch", () => {
    const report = analyzeMotifs(DIVERSE_ORIGIN_BATCH);
    expect(report.totalCandidates).toBe(5);
    expect(report.genericPhraseHits).toHaveLength(0);
    expect(repeatedMotifRatio(report)).toBeLessThan(0.15);
  });

  it("flags generic phrases in a formulaic batch", () => {
    const report = analyzeMotifs(GENERIC_ORIGIN_BATCH);
    expect(report.genericPhraseHits.length).toBeGreaterThanOrEqual(2);
    expect(report.genericPhraseHits).toContain("brave little");
    expect(report.genericPhraseHits).toContain("magic crystal");
    expect(repeatedMotifRatio(report)).toBeGreaterThan(0.15);
  });

  it("orders repeated motifs by descending count", () => {
    const report = analyzeMotifs(GENERIC_ORIGIN_BATCH);
    if (report.repeatedMotifs.length > 1) {
      const [first, second] = report.repeatedMotifs;
      expect(first?.count ?? 0).toBeGreaterThanOrEqual(second?.count ?? 0);
    }
  });
});
