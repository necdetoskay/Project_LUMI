import { describe, expect, it } from "vitest";
import { selectRelevantEntities } from "./entity-relevance.service";

describe("entity relevance", () => {
  it("returns only entities above threshold", () => {
    const result =
      selectRelevantEntities(
        [
          {
            entityId: "near",
            entityType: "character",
            proximityScore: 1,
            unresolvedGoalScore: 1,
            activeConditionScore: 1,
            relationshipScore: 1,
            recentInteractionScore: 1,
            timeSensitivityScore: 1,
          },
          {
            entityId: "far",
            entityType: "character",
            proximityScore: 0,
            unresolvedGoalScore: 0,
            activeConditionScore: 0,
            relationshipScore: 0,
            recentInteractionScore: 0,
            timeSensitivityScore: 0,
          },
        ],
        {
          threshold: 0.5,
          maxEntities: 10,
        },
      );

    expect(
      result.map((item) => item.entityId),
    ).toEqual(["near"]);
  });
});
