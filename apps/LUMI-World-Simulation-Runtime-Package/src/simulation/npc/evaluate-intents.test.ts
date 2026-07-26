import { describe, expect, it } from "vitest";
import { chooseNpcIntent } from "./evaluate-intents";

describe("NPC intent selection", () => {
  it("selects a valid high utility intent", () => {
    const result = chooseNpcIntent(
      [
        {
          intentType: "rest",
          baseUtility: 0.2,
          urgency: 0.1,
          emotionalAlignment: 0.2,
          goalAlignment: 0.1,
          relationshipAlignment: 0.1,
          environmentalFit: 0.4,
          novelty: 0.1,
          risk: 0,
        },
        {
          intentType: "rumor",
          baseUtility: 0.8,
          urgency: 0.7,
          emotionalAlignment: 0.6,
          goalAlignment: 0.7,
          relationshipAlignment: 0.8,
          environmentalFit: 0.6,
          novelty: 0.9,
          risk: 0.2,
        },
      ],
      {
        minimumUtility: 0.2,
        random: () => 0,
      },
    );

    expect(result?.intentType).toBe("rumor");
  });
});
