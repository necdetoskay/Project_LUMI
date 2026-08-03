import { describe, expect, it } from "vitest";
import { OutcomeCandidate } from "../../../src/domain/choice/outcome-candidate";
import { ValidationError } from "../../../src/domain/errors";

describe("OutcomeCandidate", () => {
  it("creates a pending outcome candidate", () => {
    const candidate = OutcomeCandidate.create({
      storySessionId: crypto.randomUUID(),
      sourceConsequenceId: crypto.randomUUID(),
      candidateSchemaVersion: 1,
      payload: { delta: { kindness: 1 } },
    });

    expect(candidate.status).toBe("pending");
    expect(candidate.id).toBeTruthy();
  });

  it("rejects non-positive schema version", () => {
    expect(() =>
      OutcomeCandidate.create({
        storySessionId: crypto.randomUUID(),
        sourceConsequenceId: crypto.randomUUID(),
        candidateSchemaVersion: 0,
        payload: {},
      }),
    ).toThrow(ValidationError);
  });

  it("rejects invalid status", () => {
    expect(() =>
      OutcomeCandidate.create({
        storySessionId: crypto.randomUUID(),
        sourceConsequenceId: crypto.randomUUID(),
        candidateSchemaVersion: 1,
        payload: {},
        status: "invalid" as never,
      }),
    ).toThrow(ValidationError);
  });
});
