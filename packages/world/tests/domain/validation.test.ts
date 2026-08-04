import { describe, it, expect } from "vitest";
import {
  validateWorldLifecycleStatus,
  validateRegionAccessibilityStatus,
  validateDiscoveryStatus,
  validateHomeType,
  validateRegionType,
  validateMoveType,
  validateLocationKey,
  validateRegionKey,
  validateDisplayName,
  validateSeed,
} from "../../src/domain/validation";
import { ValidationError } from "../../src/domain/errors";

describe("validation", () => {
  describe("validateWorldLifecycleStatus", () => {
    it("accepts valid statuses", () => {
      expect(validateWorldLifecycleStatus("active")).toBe("active");
      expect(validateWorldLifecycleStatus("archived")).toBe("archived");
      expect(validateWorldLifecycleStatus("paused")).toBe("paused");
      expect(validateWorldLifecycleStatus("frozen")).toBe("frozen");
    });

    it("rejects invalid status", () => {
      expect(() => validateWorldLifecycleStatus("invalid")).toThrow(
        ValidationError,
      );
    });
  });

  describe("validateDisplayName", () => {
    it("accepts valid name", () => {
      expect(validateDisplayName("Coral Reef")).toBe("Coral Reef");
    });

    it("trims whitespace", () => {
      expect(validateDisplayName("  Home  ")).toBe("Home");
    });

    it("rejects empty", () => {
      expect(() => validateDisplayName("")).toThrow(ValidationError);
    });

    it("rejects too long", () => {
      expect(() => validateDisplayName("x".repeat(201))).toThrow(
        ValidationError,
      );
    });
  });

  describe("validateSeed", () => {
    it("accepts valid seed", () => {
      expect(validateSeed("test-seed-001")).toBe("test-seed-001");
    });

    it("rejects empty", () => {
      expect(() => validateSeed("")).toThrow(ValidationError);
    });
  });

  describe("validateLocationKey", () => {
    it("accepts valid key", () => {
      expect(validateLocationKey("coral-house-1")).toBe("coral-house-1");
    });

    it("rejects uppercase", () => {
      expect(() => validateLocationKey("CORAL")).toThrow(ValidationError);
    });

    it("rejects spaces", () => {
      expect(() => validateLocationKey("my home")).toThrow(ValidationError);
    });
  });

  describe("validateRegionKey", () => {
    it("accepts valid key", () => {
      expect(validateRegionKey("coral-reef")).toBe("coral-reef");
    });

    it("rejects invalid", () => {
      expect(() => validateRegionKey("CORAL REEF")).toThrow(ValidationError);
    });
  });

  describe("validateRegionAccessibilityStatus", () => {
    it("accepts valid", () => {
      expect(validateRegionAccessibilityStatus("open")).toBe("open");
    });
    it("rejects invalid", () => {
      expect(() => validateRegionAccessibilityStatus("nope")).toThrow(
        ValidationError,
      );
    });
  });

  describe("validateDiscoveryStatus", () => {
    it("accepts discovered", () => {
      expect(validateDiscoveryStatus("discovered")).toBe("discovered");
    });
  });

  describe("validateHomeType", () => {
    it("accepts permanent", () => {
      expect(validateHomeType("permanent")).toBe("permanent");
    });
  });

  describe("validateRegionType", () => {
    it("accepts water", () => {
      expect(validateRegionType("water")).toBe("water");
    });
  });

  describe("validateMoveType", () => {
    it("accepts arrival", () => {
      expect(validateMoveType("arrival")).toBe("arrival");
    });
    it("rejects invalid", () => {
      expect(() => validateMoveType("unknown")).toThrow(ValidationError);
    });
  });
});
