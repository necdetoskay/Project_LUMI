import { describe, expect, it } from "vitest";
import { QuestTemplate } from "../../src/domain/quest-template";
import { ValidationError } from "../../src/domain/errors";

describe("QuestTemplate", () => {
  const validInput = {
    templateKey: "lost-letter-quest",
    displayName: "The Lost Letter",
    description: "Find the owner of the lost letter.",
    objectives: [
      { objectiveKey: "ask-shopkeeper", title: "Ask the shopkeeper" },
      { objectiveKey: "deliver-letter", title: "Deliver the letter" },
    ],
  };

  it("creates a template with ordered objectives", () => {
    const template = QuestTemplate.create(validInput);
    const state = template.getState();

    expect(state.templateKey).toBe("lost-letter-quest");
    expect(state.displayName).toBe("The Lost Letter");
    expect(state.version).toBe(1);
    expect(state.objectives).toHaveLength(2);
    expect(state.objectives[0]).toMatchObject({
      index: 0,
      objectiveKey: "ask-shopkeeper",
      title: "Ask the shopkeeper",
    });
    expect(state.objectives[1]).toMatchObject({
      index: 1,
      objectiveKey: "deliver-letter",
      title: "Deliver the letter",
    });
  });

  it("rejects a template with zero objectives", () => {
    expect(() =>
      QuestTemplate.create({
        templateKey: "empty-quest",
        displayName: "Empty",
        description: "n/a",
        objectives: [],
      }),
    ).toThrow(ValidationError);
  });

  it("rejects an invalid template key", () => {
    expect(() =>
      QuestTemplate.create({ ...validInput, templateKey: "Lost Letter" }),
    ).toThrow(ValidationError);
  });

  it("rejects an invalid objective key", () => {
    expect(() =>
      QuestTemplate.create({
        ...validInput,
        objectives: [{ objectiveKey: "Ask Shopkeeper", title: "x" }],
      }),
    ).toThrow(ValidationError);
  });

  it("rejects an empty display name", () => {
    expect(() =>
      QuestTemplate.create({ ...validInput, displayName: "   " }),
    ).toThrow(ValidationError);
  });

  it("round-trips through fromState", () => {
    const template = QuestTemplate.create(validInput);
    const restored = QuestTemplate.fromState(template.getState());
    expect(restored.getState()).toEqual(template.getState());
  });

  it("returns a defensive copy of objectives", () => {
    const template = QuestTemplate.create(validInput);
    const objectives = template.objectives;
    if (!objectives[0]) throw new Error("expected first objective");
    objectives[0].title = "mutated";
    expect(template.objectives[0]?.title).toBe("Ask the shopkeeper");
  });
});
