import { describe, expect, it } from "vitest";
import {
  CommittedChoice,
  assertSingleCommit,
} from "../../../src/domain/choice/committed-choice";
import { ValidationError } from "../../../src/domain/errors";

describe("CommittedChoice", () => {
  it("creates a committed choice", () => {
    const committed = CommittedChoice.create({
      storySessionId: crypto.randomUUID(),
      choicePointId: crypto.randomUUID(),
      optionId: crypto.randomUUID(),
      evidenceSceneId: crypto.randomUUID(),
      ruleVersion: 2,
    });

    expect(committed.ruleVersion).toBe(2);
    expect(committed.evidenceSceneId).toBeTruthy();
  });

  it("assertSingleCommit allows retry with same option", () => {
    const state = CommittedChoice.create({
      storySessionId: crypto.randomUUID(),
      choicePointId: crypto.randomUUID(),
      optionId: "same-option-id",
      evidenceSceneId: crypto.randomUUID(),
      ruleVersion: 1,
    }).getState();

    expect(() => assertSingleCommit(state, "same-option-id")).not.toThrow();
  });

  it("assertSingleCommit rejects different option", () => {
    const state = CommittedChoice.create({
      storySessionId: crypto.randomUUID(),
      choicePointId: crypto.randomUUID(),
      optionId: "option-a",
      evidenceSceneId: crypto.randomUUID(),
      ruleVersion: 1,
    }).getState();

    expect(() => assertSingleCommit(state, "option-b")).toThrow(
      ValidationError,
    );
  });
});
