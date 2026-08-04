import { describe, it, expect } from "vitest";
import {
  validateAgeBand,
  validateDisplayName,
  validateSlug,
  validateMembershipRole,
  validateStoryLength,
  validateInteractionLevel,
  validateCharacterOriginHandoff,
} from "../../src/domain/validation";
import { ValidationError } from "../../src/domain/errors";

describe("validation", () => {
  describe("validateAgeBand", () => {
    it("accepts valid age bands", () => {
      expect(validateAgeBand("3-5")).toBe("3-5");
      expect(validateAgeBand("13+")).toBe("13+");
    });

    it("rejects invalid age bands", () => {
      expect(() => validateAgeBand("2-4")).toThrow(ValidationError);
    });
  });

  describe("validateDisplayName", () => {
    it("trims whitespace", () => {
      expect(validateDisplayName("  Alice  ")).toBe("Alice");
    });

    it("rejects empty", () => {
      expect(() => validateDisplayName("")).toThrow(ValidationError);
    });

    it("rejects too long", () => {
      expect(() => validateDisplayName("x".repeat(121))).toThrow(
        ValidationError,
      );
    });
  });

  describe("validateSlug", () => {
    it("accepts valid slugs", () => {
      expect(validateSlug("my-family")).toBe("my-family");
      expect(validateSlug("family123")).toBe("family123");
    });

    it("rejects uppercase", () => {
      expect(() => validateSlug("My-Family")).toThrow(ValidationError);
    });

    it("rejects spaces", () => {
      expect(() => validateSlug("my family")).toThrow(ValidationError);
    });

    it("rejects too short", () => {
      expect(() => validateSlug("a")).toThrow(ValidationError);
    });
  });

  describe("validateMembershipRole", () => {
    it("accepts valid roles", () => {
      expect(validateMembershipRole("owner")).toBe("owner");
      expect(validateMembershipRole("guardian")).toBe("guardian");
    });

    it("rejects invalid roles", () => {
      expect(() => validateMembershipRole("admin")).toThrow(ValidationError);
    });
  });

  describe("validateStoryLength", () => {
    it("accepts valid lengths", () => {
      expect(validateStoryLength("short")).toBe("short");
      expect(validateStoryLength("long")).toBe("long");
    });

    it("rejects invalid lengths", () => {
      expect(() => validateStoryLength("very-long")).toThrow(ValidationError);
    });
  });

  describe("validateInteractionLevel", () => {
    it("accepts valid levels", () => {
      expect(validateInteractionLevel(0)).toBe(0);
      expect(validateInteractionLevel(5)).toBe(5);
    });

    it("rejects out of range", () => {
      expect(() => validateInteractionLevel(6)).toThrow(ValidationError);
      expect(() => validateInteractionLevel(-1)).toThrow(ValidationError);
    });

    it("rejects non-integer", () => {
      expect(() => validateInteractionLevel(2.5)).toThrow(ValidationError);
    });
  });

  describe("validateCharacterOriginHandoff", () => {
    it("accepts valid handoff", () => {
      expect(() =>
        validateCharacterOriginHandoff({
          childProfileId: crypto.randomUUID(),
          characterType: "explorer",
          originMode: "manual",
        }),
      ).not.toThrow();
    });

    it("rejects missing childProfileId", () => {
      expect(() =>
        validateCharacterOriginHandoff({
          childProfileId: "",
          characterType: "explorer",
          originMode: "manual",
        }),
      ).toThrow(ValidationError);
    });

    it("rejects invalid character type", () => {
      expect(() =>
        validateCharacterOriginHandoff({
          childProfileId: crypto.randomUUID(),
          characterType: "wizard",
          originMode: "manual",
        }),
      ).toThrow(ValidationError);
    });

    it("rejects invalid origin mode", () => {
      expect(() =>
        validateCharacterOriginHandoff({
          childProfileId: crypto.randomUUID(),
          characterType: "explorer",
          originMode: "hybrid",
        }),
      ).toThrow(ValidationError);
    });
  });
});
