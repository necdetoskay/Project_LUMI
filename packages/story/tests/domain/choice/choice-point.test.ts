import { describe, expect, it } from "vitest";
import { ChoicePoint } from "../../../src/domain/choice/choice-point";
import { ValidationError } from "../../../src/domain/errors";

describe("ChoicePoint", () => {
  it("creates a valid choice point", () => {
    const point = ChoicePoint.create({
      storyVersionId: crypto.randomUUID(),
      sceneId: crypto.randomUUID(),
      choicePointKey: "crossroads",
      choicePointType: "single",
      promptText: "Which path do you take?",
    });

    expect(point.choicePointKey).toBe("crossroads");
    expect(point.ruleVersion).toBe(1);
  });

  it("rejects invalid choice point type", () => {
    expect(() =>
      ChoicePoint.create({
        storyVersionId: crypto.randomUUID(),
        sceneId: crypto.randomUUID(),
        choicePointKey: "crossroads",
        choicePointType: "invalid" as never,
        promptText: "Which path?",
      }),
    ).toThrow(ValidationError);
  });

  it("rejects empty prompt text", () => {
    expect(() =>
      ChoicePoint.create({
        storyVersionId: crypto.randomUUID(),
        sceneId: crypto.randomUUID(),
        choicePointKey: "crossroads",
        choicePointType: "single",
        promptText: "   ",
      }),
    ).toThrow(ValidationError);
  });
});
