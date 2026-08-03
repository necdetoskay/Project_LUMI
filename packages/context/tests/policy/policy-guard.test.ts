import { describe, expect, it } from "vitest";

import { ensureParentPolicyDoesNotLoosenSafety, DEFAULT_SAFETY_BASELINE } from "../../src/policy";
import type { ParentPolicyItem } from "../../src/ports";
import { testParentPolicy, createLooseningParentPolicy } from "../fixtures/contexts";

describe("ensureParentPolicyDoesNotLoosenSafety", () => {
  it("allows a compliant parent policy", () => {
    const result = ensureParentPolicyDoesNotLoosenSafety(testParentPolicy, DEFAULT_SAFETY_BASELINE);

    expect(result.allowed).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.sanitizedPolicy.contentBoundary).toBe("strict");
  });

  it("rejects a parent policy that loosens content boundary", () => {
    const loosening = createLooseningParentPolicy();
    const result = ensureParentPolicyDoesNotLoosenSafety(loosening, DEFAULT_SAFETY_BASELINE);

    expect(result.allowed).toBe(false);
    expect(result.violations.some((v) => v.field === "contentBoundary")).toBe(true);
    expect(result.sanitizedPolicy.contentBoundary).toBe("strict");
  });

  it("rejects a parent policy that removes AI approval", () => {
    const policy: ParentPolicyItem = {
      ...testParentPolicy,
      requireParentApprovalForAi: false,
    };
    const result = ensureParentPolicyDoesNotLoosenSafety(policy, DEFAULT_SAFETY_BASELINE);

    expect(result.allowed).toBe(false);
    expect(result.violations.some((v) => v.field === "requireParentApprovalForAi")).toBe(true);
    expect(result.sanitizedPolicy.requireParentApprovalForAi).toBe(true);
  });

  it("rejects a parent policy that exceeds the daily story cap", () => {
    const policy: ParentPolicyItem = {
      ...testParentPolicy,
      maxDailyStories: 100,
    };
    const result = ensureParentPolicyDoesNotLoosenSafety(policy, DEFAULT_SAFETY_BASELINE);

    expect(result.allowed).toBe(false);
    expect(result.violations.some((v) => v.field === "maxDailyStories")).toBe(true);
    expect(result.sanitizedPolicy.maxDailyStories).toBe(DEFAULT_SAFETY_BASELINE.maxDailyStoriesCap);
  });

  it("rejects a parent policy that allows forbidden image generation", () => {
    const policy: ParentPolicyItem = {
      ...testParentPolicy,
      allowImageGeneration: true,
    };
    const result = ensureParentPolicyDoesNotLoosenSafety(policy, DEFAULT_SAFETY_BASELINE);

    expect(result.allowed).toBe(false);
    expect(result.violations.some((v) => v.field === "allowImageGeneration")).toBe(true);
    expect(result.sanitizedPolicy.allowImageGeneration).toBe(false);
  });

  it("restores missing forbidden themes from baseline", () => {
    const policy: ParentPolicyItem = {
      ...testParentPolicy,
      forbiddenThemes: ["profanity"],
    };
    const result = ensureParentPolicyDoesNotLoosenSafety(policy, DEFAULT_SAFETY_BASELINE);

    expect(result.allowed).toBe(false);
    expect(result.violations.some((v) => v.field === "forbiddenThemes")).toBe(true);
    expect(result.sanitizedPolicy.forbiddenThemes).toContain("violence");
    expect(result.sanitizedPolicy.forbiddenThemes).toContain("profanity");
  });

  it("sanitizes multiple violations at once", () => {
    const loosening = createLooseningParentPolicy();
    const result = ensureParentPolicyDoesNotLoosenSafety(loosening, DEFAULT_SAFETY_BASELINE);

    expect(result.allowed).toBe(false);
    expect(result.violations.length).toBeGreaterThan(1);
    expect(result.sanitizedPolicy.contentBoundary).toBe("strict");
    expect(result.sanitizedPolicy.requireParentApprovalForAi).toBe(true);
    expect(result.sanitizedPolicy.allowImageGeneration).toBe(false);
    expect(result.sanitizedPolicy.maxDailyStories).toBeLessThanOrEqual(
      DEFAULT_SAFETY_BASELINE.maxDailyStoriesCap,
    );
  });
});
