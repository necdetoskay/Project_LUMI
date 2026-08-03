import { describe, expect, it } from "vitest";
import { ChoiceOption } from "../../../src/domain/choice/choice-option";
import { ValidationError } from "../../../src/domain/errors";

describe("ChoiceOption", () => {
  it("creates a valid option", () => {
    const option = ChoiceOption.create({
      choicePointId: crypto.randomUUID(),
      optionKey: "left",
      optionText: "Take the left path",
    });

    expect(option.choicePointId).toBeTruthy();
    expect(option.availabilityRule).toBeNull();
  });

  it("rejects empty option text", () => {
    expect(() =>
      ChoiceOption.create({
        choicePointId: crypto.randomUUID(),
        optionKey: "left",
        optionText: "",
      }),
    ).toThrow(ValidationError);
  });

  it("preserves consequence previews", () => {
    const option = ChoiceOption.create({
      choicePointId: crypto.randomUUID(),
      optionKey: "left",
      optionText: "Take the left path",
      consequencePreviews: [
        {
          consequenceType: "scene_transition",
          previewText: "You move toward the forest",
        },
      ],
    });

    expect(option.consequencePreviews).toHaveLength(1);
    expect(option.consequencePreviews[0]!.previewText).toBe("You move toward the forest");
  });
});
