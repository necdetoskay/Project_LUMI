import { describe, expect, it } from "vitest";
import { calculateOpportunityMetrics } from "./calculate-opportunity-metrics";

describe("opportunity metrics", () => {
  it("calculates acceptance and conversion rates", () => {
    const result =
      calculateOpportunityMetrics({
        received: 10,
        viewed: 9,
        accepted: 5,
        declined: 2,
        snoozed: 1,
        expired: 2,
        storyStarted: 4,
      });

    expect(result.acceptanceRate).toBe(0.5);
    expect(result.storyConversionRate).toBe(0.8);
  });
});
