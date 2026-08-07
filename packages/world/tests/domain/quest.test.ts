import { describe, it, expect } from "vitest";
import { Quest } from "../../src/domain/quest";
import { ValidationError } from "../../src/domain/errors";
import type { CreateQuestInput } from "../../src/domain/quest";

function expectValidationError(fn: () => unknown, code: string): void {
  let caught: unknown;
  try {
    fn();
  } catch (err) {
    caught = err;
  }
  expect(caught).toBeInstanceOf(ValidationError);
  expect((caught as ValidationError).code).toBe(code);
}

const HOUSEHOLD = "00000000-0000-4000-8000-000000000020";
const WORLD = "00000000-0000-4000-8000-000000000030";
const SESSION = "00000000-0000-4000-8000-000000000022";

function makeInput(
  overrides: Partial<CreateQuestInput> = {},
): CreateQuestInput {
  return {
    householdId: HOUSEHOLD,
    worldId: WORLD,
    title: "Lost Letter",
    summary: "Find the owner of a lost letter.",
    objectives: [
      { title: "Find the letter owner" },
      { title: "Deliver the letter" },
    ],
    ...overrides,
  };
}

describe("Quest", () => {
  it("creates a quest in inactive status with ordered objectives", () => {
    const quest = Quest.create(makeInput());

    const state = quest.getState();
    expect(state.status).toBe("inactive");
    expect(state.version).toBe(1);
    expect(state.objectives).toHaveLength(2);
    expect(state.objectives[0]).toMatchObject({
      index: 0,
      title: "Find the letter owner",
      status: "locked",
    });
    expect(state.objectives[1]).toMatchObject({
      index: 1,
      title: "Deliver the letter",
      status: "locked",
    });
    expect(state.storySessionId).toBeNull();
  });

  it("accepts an optional story session link", () => {
    const quest = Quest.create(makeInput({ storySessionId: SESSION }));
    expect(quest.storySessionId).toBe(SESSION);
  });

  it("rejects a quest with no objectives", () => {
    expectValidationError(
      () => Quest.create(makeInput({ objectives: [] })),
      "QUEST_NO_OBJECTIVES",
    );
  });

  it("rejects a quest with an empty title", () => {
    expect(() => Quest.create(makeInput({ title: "  " }))).toThrow(
      ValidationError,
    );
  });

  it("assigns sequential objective indices", () => {
    const quest = Quest.create(
      makeInput({
        objectives: [
          { title: "A" },
          { title: "B" },
          { title: "C" },
        ],
      }),
    );
    const indices = quest.objectives.map((o) => o.index);
    expect(indices).toEqual([0, 1, 2]);
  });

  it("reconstitutes from saved state", () => {
    const original = Quest.create(makeInput());
    const saved = original.getState();
    const reconstituted = Quest.fromState(saved);
    expect(reconstituted.getState()).toEqual(saved);
  });
});

describe("Quest lifecycle transitions", () => {
  it("activates an inactive quest and bumps version", () => {
    const quest = Quest.create(makeInput());
    quest.activate("evidence://activate");
    expect(quest.status).toBe("active");
    expect(quest.version).toBe(2);
    expect(quest.getState().evidenceRef).toBe("evidence://activate");
  });

  it("rejects activating a non-inactive quest", () => {
    const quest = Quest.create(makeInput());
    quest.activate("evidence://activate");
    expectValidationError(
      () => quest.activate("evidence://again"),
      "QUEST_INVALID_TRANSITION",
    );
  });

  it("pauses and resumes an active quest", () => {
    const quest = Quest.create(makeInput());
    quest.activate("evidence://activate");
    quest.pause("evidence://pause");
    expect(quest.status).toBe("paused");
    expect(quest.version).toBe(3);

    quest.resume("evidence://resume");
    expect(quest.status).toBe("active");
    expect(quest.version).toBe(4);
  });

  it("rejects resuming a non-paused quest", () => {
    const quest = Quest.create(makeInput());
    quest.activate("evidence://activate");
    expectValidationError(
      () => quest.resume("evidence://resume"),
      "QUEST_INVALID_TRANSITION",
    );
  });

  it("abandons an active quest", () => {
    const quest = Quest.create(makeInput());
    quest.activate("evidence://activate");
    quest.abandon("evidence://abandon");
    expect(quest.status).toBe("abandoned");
  });

  it("rejects abandoning a completed quest", () => {
    const quest = Quest.create(makeInput());
    quest.activate("evidence://activate");
    quest.progressObjective({ objectiveIndex: 0, evidenceRef: "e://o0" });
    quest.progressObjective({ objectiveIndex: 1, evidenceRef: "e://o1" });
    expect(quest.status).toBe("completed");
    expectValidationError(
      () => quest.abandon("e://abandon"),
      "QUEST_INVALID_TRANSITION",
    );
  });

  it("rejects abandoning an already-abandoned quest", () => {
    const quest = Quest.create(makeInput());
    quest.activate("evidence://activate");
    quest.abandon("evidence://abandon");
    expectValidationError(
      () => quest.abandon("e://again"),
      "QUEST_INVALID_TRANSITION",
    );
  });
});

describe("Quest objective progression", () => {
  it("rejects progression on an inactive quest", () => {
    const quest = Quest.create(makeInput());
    expectValidationError(
      () =>
        quest.progressObjective({ objectiveIndex: 0, evidenceRef: "e://o0" }),
      "QUEST_INVALID_TRANSITION",
    );
  });

  it("rejects progression on a paused quest", () => {
    const quest = Quest.create(makeInput());
    quest.activate("e://activate");
    quest.pause("e://pause");
    expectValidationError(
      () =>
        quest.progressObjective({ objectiveIndex: 0, evidenceRef: "e://o0" }),
      "QUEST_INVALID_TRANSITION",
    );
  });

  it("progresses an objective on an active quest and bumps version", () => {
    const quest = Quest.create(makeInput());
    quest.activate("e://activate");
    const before = quest.version;
    quest.progressObjective({ objectiveIndex: 0, evidenceRef: "e://o0" });

    expect(quest.objectives[0]).toMatchObject({
      status: "completed",
      evidenceRef: "e://o0",
    });
    expect(quest.version).toBe(before + 1);
  });

  it("rejects progress with an out-of-range objective index", () => {
    const quest = Quest.create(makeInput());
    quest.activate("e://activate");
    expectValidationError(
      () =>
        quest.progressObjective({ objectiveIndex: 5, evidenceRef: "e://x" }),
      "QUEST_OBJECTIVE_NOT_FOUND",
    );
  });

  it("rejects double-completing the same objective", () => {
    const quest = Quest.create(makeInput());
    quest.activate("e://activate");
    quest.progressObjective({ objectiveIndex: 0, evidenceRef: "e://o0" });
    expectValidationError(
      () =>
        quest.progressObjective({ objectiveIndex: 0, evidenceRef: "e://again" }),
      "QUEST_OBJECTIVE_ALREADY_COMPLETED",
    );
  });

  it("auto-completes the quest when the final objective is done", () => {
    const quest = Quest.create(makeInput());
    quest.activate("e://activate");
    quest.progressObjective({ objectiveIndex: 0, evidenceRef: "e://o0" });
    expect(quest.status).toBe("active");

    quest.progressObjective({ objectiveIndex: 1, evidenceRef: "e://o1" });
    expect(quest.status).toBe("completed");
  });
});