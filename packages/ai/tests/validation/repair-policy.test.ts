import { describe, expect, it } from "vitest";

import { RepairPolicy } from "../../src/validation/repair-policy";
import { RepairLimitReachedError } from "../../src/domain/generation-errors";
import type { ValidationFinding } from "../../src/domain/validation-types";

function finding(
  kind: ValidationFinding["kind"],
  severity: ValidationFinding["severity"],
): ValidationFinding {
  return { kind, code: `${kind.toUpperCase()}-1`, message: "test", severity };
}

describe("RepairPolicy", () => {
  it("repairs malformed JSON while the budget allows", () => {
    const policy = new RepairPolicy({ maxAttempts: 2 });
    const decision = policy.decide([finding("schema", "error")], 0);
    expect(decision.action).toBe("repair");
    expect(decision.reason).toContain("malformed JSON");
  });

  it("throws when the repair limit is reached", () => {
    const policy = new RepairPolicy({ maxAttempts: 1 });
    expect(() => policy.decide([finding("schema", "error")], 1)).toThrow(
      RepairLimitReachedError,
    );
  });

  it("rejects safety violations immediately", () => {
    const policy = new RepairPolicy({ maxAttempts: 3 });
    const decision = policy.decide([finding("safety", "error")], 0);
    expect(decision.action).toBe("reject");
    expect(decision.reason).toContain("cannot be repaired");
  });

  it("regenerates on continuity errors when allowed", () => {
    const policy = new RepairPolicy({ maxAttempts: 3, allowRegenerate: true });
    const decision = policy.decide([finding("continuity", "error")], 0);
    expect(decision.action).toBe("regenerate");
  });

  it("falls back to a template when configured", () => {
    const policy = new RepairPolicy({
      maxAttempts: 3,
      allowRegenerate: false,
      fallbackTemplateOnReject: true,
    });
    const decision = policy.decide([finding("canon", "error")], 0);
    expect(decision.action).toBe("fallback_template");
  });

  it("rejects when no applicable path exists", () => {
    const policy = new RepairPolicy({
      maxAttempts: 3,
      allowRegenerate: false,
      fallbackTemplateOnReject: false,
    });
    const decision = policy.decide([finding("canon", "error")], 0);
    expect(decision.action).toBe("reject");
  });

  it("returns reject when there are no error findings", () => {
    const policy = new RepairPolicy({ maxAttempts: 3 });
    const decision = policy.decide([finding("continuity", "warning")], 0);
    expect(decision.action).toBe("reject");
  });
});
