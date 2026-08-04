import { describe, expect, it } from "vitest";
import {
  applyVariables,
  resolveVariableValue,
  validateVariableDefinition,
} from "../../src/domain/prompt-variable";
import { ValidationError } from "../../src/domain/errors";

describe("PromptVariable", () => {
  describe("validation", () => {
    it("validates a string variable", () => {
      expect(
        resolveVariableValue(
          { name: "x", type: "string", required: true },
          "hello",
        ),
      ).toBe("hello");
    });

    it("validates a number variable", () => {
      expect(resolveVariableValue({ name: "x", type: "number" }, 42)).toBe(42);
    });

    it("rejects NaN for number type", () => {
      expect(() =>
        resolveVariableValue({ name: "x", type: "number" }, NaN),
      ).toThrow(ValidationError);
    });

    it("validates a boolean variable", () => {
      expect(resolveVariableValue({ name: "x", type: "boolean" }, true)).toBe(
        true,
      );
    });

    it("validates an enum variable", () => {
      expect(
        resolveVariableValue(
          { name: "x", type: "enum", enumValues: ["a", "b"] },
          "a",
        ),
      ).toBe("a");
    });

    it("rejects invalid enum value", () => {
      expect(() =>
        resolveVariableValue(
          { name: "x", type: "enum", enumValues: ["a", "b"] },
          "c",
        ),
      ).toThrow(ValidationError);
    });

    it("rejects enum definition without enumValues", () => {
      expect(() =>
        resolveVariableValue({ name: "x", type: "enum" }, "a"),
      ).toThrow(ValidationError);
    });

    it("validates a json variable", () => {
      expect(
        resolveVariableValue({ name: "x", type: "json" }, { a: 1 }),
      ).toEqual({ a: 1 });
    });

    it("rejects undefined value for required variable", () => {
      expect(() =>
        resolveVariableValue(
          { name: "x", type: "string", required: true },
          undefined,
        ),
      ).toThrow(ValidationError);
    });

    it("allows undefined value for optional variable", () => {
      expect(
        resolveVariableValue({ name: "x", type: "string" }, undefined),
      ).toBeUndefined();
    });

    it("falls back to default value", () => {
      expect(
        resolveVariableValue(
          { name: "x", type: "string", default: "fallback" },
          undefined,
        ),
      ).toBe("fallback");
    });

    it("uses provided value over default", () => {
      expect(
        resolveVariableValue(
          { name: "x", type: "string", default: "fallback" },
          "provided",
        ),
      ).toBe("provided");
    });

    it("validates default value type", () => {
      expect(() =>
        resolveVariableValue(
          { name: "x", type: "number", default: "not-a-number" },
          undefined,
        ),
      ).toThrow(ValidationError);
    });
  });

  describe("applyVariables", () => {
    it("resolves multiple variables", () => {
      const defs = [
        { name: "a", type: "string" as const, required: true },
        { name: "b", type: "number" as const, default: 0 },
      ];
      const result = applyVariables(defs, { a: "hello", b: 5 });
      expect(result).toEqual({ a: "hello", b: 5 });
    });

    it("throws for missing required variable", () => {
      const defs = [{ name: "a", type: "string" as const, required: true }];
      expect(() => applyVariables(defs, {})).toThrow(ValidationError);
    });
  });

  describe("validateVariableDefinition", () => {
    it("accepts a valid definition", () => {
      expect(() =>
        validateVariableDefinition({
          name: "x",
          type: "string",
          required: true,
        }),
      ).not.toThrow();
    });

    it("rejects missing name", () => {
      expect(() =>
        validateVariableDefinition({ name: "", type: "string" }),
      ).toThrow(ValidationError);
    });

    it("rejects invalid type", () => {
      expect(() =>
        validateVariableDefinition({ name: "x", type: "invalid" as never }),
      ).toThrow(ValidationError);
    });
  });
});
