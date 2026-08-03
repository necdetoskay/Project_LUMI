import { describe, expect, it } from "vitest";

import { SafetyChecker } from "../../src/validation/safety-checker";

describe("SafetyChecker", () => {
  it("flags forbidden content as an error", () => {
    const checker = new SafetyChecker();
    const findings = checker.check(
      "The story mentions a weapon hidden in the closet.",
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.kind).toBe("safety");
    expect(findings[0]?.code).toBe("SAFETY-001");
    expect(findings[0]?.severity).toBe("error");
  });

  it("accepts clean child-friendly text", () => {
    const checker = new SafetyChecker();
    const findings = checker.check(
      "The little fox found a glowing acorn under the oak tree.",
    );
    expect(findings).toHaveLength(0);
  });

  it("flags too many scary signals", () => {
    const checker = new SafetyChecker();
    const findings = checker.check(
      "A monster attack. They were chased and trapped. A scream.",
    );
    expect(findings.some((f) => f.code === "SAFETY-002")).toBe(true);
  });

  it("does not flag when scary signals are under the threshold", () => {
    const checker = new SafetyChecker();
    const findings = checker.check("A gentle mystery with no monsters.");
    expect(findings).toHaveLength(0);
  });

  it("respects custom forbidden patterns", () => {
    const checker = new SafetyChecker({ forbiddenPatterns: ["potion"] });
    expect(checker.check("She drank the potion.")).toHaveLength(1);
    expect(checker.check("The cozy cottage is fine.")).toHaveLength(0);
  });
});
