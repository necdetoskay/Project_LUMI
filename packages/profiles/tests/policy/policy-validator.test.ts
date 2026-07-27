import { describe, it, expect } from "vitest";
import {
  validatePolicyInput,
  checkGuardianPermission,
  validateAgeBandConsistency,
} from "../../src/policy/validator";

describe("Policy Validator", () => {
  describe("validatePolicyInput", () => {
    it("accepts valid input", () => {
      const result = validatePolicyInput({
        householdId: crypto.randomUUID(),
        maxDailyStories: 10,
        contentBoundary: "moderate",
        timeLimitMinutes: 60,
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects negative daily limit", () => {
      const result = validatePolicyInput({
        householdId: crypto.randomUUID(),
        maxDailyStories: -1,
      });
      expect(result.valid).toBe(false);
    });

    it("rejects daily limit over 50", () => {
      const result = validatePolicyInput({
        householdId: crypto.randomUUID(),
        maxDailyStories: 100,
      });
      expect(result.valid).toBe(false);
    });

    it("rejects invalid content boundary", () => {
      const result = validatePolicyInput({
        householdId: crypto.randomUUID(),
        contentBoundary: "extreme",
      });
      expect(result.valid).toBe(false);
    });

    it("warns when time limit exceeds 24h", () => {
      const result = validatePolicyInput({
        householdId: crypto.randomUUID(),
        timeLimitMinutes: 2000,
      });
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]!.code).toBe("TIME_LIMIT_EXCEEDS_DAY");
    });
  });

  describe("checkGuardianPermission", () => {
    it("allows when no approval required", () => {
      const result = checkGuardianPermission({
        guardianUserId: crypto.randomUUID(),
        householdId: crypto.randomUUID(),
        requestedAction: "ai_content_generation",
        parentPolicy: {
          requireParentApprovalForAi: false,
          contentBoundary: "strict",
        },
      });
      expect(result.allowed).toBe(true);
    });

    it("denies AI content when approval required", () => {
      const result = checkGuardianPermission({
        guardianUserId: crypto.randomUUID(),
        householdId: crypto.randomUUID(),
        requestedAction: "ai_content_generation",
        parentPolicy: {
          requireParentApprovalForAi: true,
          contentBoundary: "strict",
        },
      });
      expect(result.allowed).toBe(false);
    });
  });

  describe("validateAgeBandConsistency", () => {
    it("accepts consistent values", () => {
      const result = validateAgeBandConsistency("6-8", "medium", 2);
      expect(result.valid).toBe(true);
    });

    it("rejects invalid age band", () => {
      const result = validateAgeBandConsistency("invalid", "medium", 2);
      expect(result.valid).toBe(false);
    });

    it("rejects invalid story length", () => {
      const result = validateAgeBandConsistency("6-8", "extra", 2);
      expect(result.valid).toBe(false);
    });

    it("rejects invalid interaction level", () => {
      const result = validateAgeBandConsistency("6-8", "medium", 10);
      expect(result.valid).toBe(false);
    });

    it("warns on high interaction for young age", () => {
      const result = validateAgeBandConsistency("3-5", "short", 4);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]!.code).toBe("HIGH_INTERACTION_YOUNG_AGE");
    });
  });
});
