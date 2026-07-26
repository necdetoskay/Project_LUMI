import { describe, expect, it } from "vitest";
import { calculateNoveltyScore } from "./novelty-control";

describe("interaction novelty", () => {
  it("reduces novelty when repetitions increase", () => {
    expect(
      calculateNoveltyScore({
        sameTypeCountLast7Days: 0,
        sameSourceCountLast7Days: 0,
        similarSummaryCountLast30Days: 0,
      }),
    ).toBeGreaterThan(
      calculateNoveltyScore({
        sameTypeCountLast7Days: 5,
        sameSourceCountLast7Days: 5,
        similarSummaryCountLast30Days: 3,
      }),
    );
  });
});
