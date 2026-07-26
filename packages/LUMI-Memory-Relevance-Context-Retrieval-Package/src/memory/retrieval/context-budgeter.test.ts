import { describe, expect, it } from "vitest";
import { budgetMemories } from "./context-budgeter";

describe("context budgeter", () => {
  it("selects highest-scoring memories within budget", () => {
    const result = budgetMemories(
      [
        {
          memoryId: "a",
          summary: "A",
          memoryType: "event",
          occurredAt: new Date(),
          importance: 1,
          emotionalSalience: 1,
          consequenceWeight: 1,
          semanticScore: 1,
          subjectScore: 1,
          recencyScore: 1,
          finalScore: 0.9,
          estimatedTokens: 80,
        },
        {
          memoryId: "b",
          summary: "B",
          memoryType: "event",
          occurredAt: new Date(),
          importance: 1,
          emotionalSalience: 1,
          consequenceWeight: 1,
          semanticScore: 1,
          subjectScore: 1,
          recencyScore: 1,
          finalScore: 0.7,
          estimatedTokens: 50,
        },
      ],
      100,
    );

    expect(
      result.map((item) => item.memoryId),
    ).toEqual(["a"]);
  });
});
