import { describe, expect, it } from "vitest";

import { CanonChecker } from "../../src/validation/canon-checker";
import { ContinuityChecker } from "../../src/validation/continuity-checker";

describe("CanonChecker", () => {
  it("flags generic chosen-one premises", () => {
    const checker = new CanonChecker();
    const findings = checker.check(
      "You are the chosen one who must save the world.",
    );
    expect(findings.some((f) => f.code === "CANON-001")).toBe(true);
    expect(findings[0]?.severity).toBe("error");
  });

  it("accepts canon-compliant text", () => {
    const checker = new CanonChecker();
    const findings = checker.check(
      "The cloud fox collects lost sounds for the village.",
    );
    expect(findings).toHaveLength(0);
  });
});

describe("ContinuityChecker", () => {
  it("warns when the scene ignores all known entities", () => {
    const checker = new ContinuityChecker();
    const findings = checker.check({
      knownEntities: ["Luna", "Milo", "Oakwood"],
      previousCharacterNames: ["Luna"],
      previousSettings: ["the whispering willow"],
      currentSceneText:
        "A stranger wandered through a dark tunnel with no lights.",
    });
    expect(findings.some((f) => f.code === "CONTINUITY-001")).toBe(true);
    expect(findings.some((f) => f.severity === "warning")).toBe(true);
  });

  it("accepts a scene that references known entities", () => {
    const checker = new ContinuityChecker();
    const findings = checker.check({
      knownEntities: ["Luna"],
      previousCharacterNames: ["Luna"],
      previousSettings: ["the whispering willow"],
      currentSceneText: "Luna returned to the whispering willow.",
    });
    expect(findings).toHaveLength(0);
  });

  it("flags explicit setting contradictions as errors", () => {
    const checker = new ContinuityChecker();
    const findings = checker.check({
      knownEntities: ["Luna"],
      previousCharacterNames: ["Luna"],
      previousSettings: ["the whispering willow"],
      currentSceneText: "Luna watched the whispering willow disappeared.",
    });
    expect(findings.some((f) => f.code === "CONTINUITY-002")).toBe(true);
    expect(findings.some((f) => f.severity === "error")).toBe(true);
  });
});
