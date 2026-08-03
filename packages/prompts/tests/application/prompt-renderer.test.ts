import { describe, expect, it } from "vitest";
import { renderPrompt } from "../../src/application/rendering/prompt-renderer";
import { ValidationError } from "../../src/domain/errors";
import type { PromptVariableDefinition } from "../../src/domain/prompt-variable";

describe("PromptRenderer", () => {
  const versionId = crypto.randomUUID();
  const definitions: PromptVariableDefinition[] = [
    { name: "childName", type: "string", required: true },
    { name: "age", type: "number", required: true },
    { name: "mood", type: "enum", enumValues: ["happy", "sad"], default: "happy" },
    { name: "extra", type: "json", required: false },
  ];

  it("renders simple substitution", () => {
    const result = renderPrompt(
      "Hello {{childName}}, age {{age}}, mood {{mood}}.",
      versionId,
      definitions,
      { childName: "Ada", age: 7, mood: "happy" },
    );
    expect(result.renderedText).toBe("Hello Ada, age 7, mood happy.");
    expect(result.versionId).toBe(versionId);
    expect(result.resolvedVariables).toEqual({ childName: "Ada", age: 7, mood: "happy", extra: undefined });
    expect(result.tokenEstimate).toBeGreaterThan(0);
  });

  it("uses default value when variable is missing", () => {
    const result = renderPrompt(
      "Mood: {{mood}}",
      versionId,
      definitions,
      { childName: "Ada", age: 7 },
    );
    expect(result.renderedText).toBe("Mood: happy");
  });

  it("throws when required variable is missing", () => {
    expect(() =>
      renderPrompt("Hello {{childName}}", versionId, definitions, { age: 7 }),
    ).toThrow(ValidationError);
  });

  it("throws on type mismatch", () => {
    expect(() =>
      renderPrompt("Age: {{age}}", versionId, definitions, { childName: "Ada", age: "seven" }),
    ).toThrow(ValidationError);
  });

  it("escapes braces to prevent injection", () => {
    const result = renderPrompt(
      "Input: {{childName}}",
      versionId,
      [{ name: "childName", type: "string" }],
      { childName: "{{injected}}" },
    );
    expect(result.renderedText).not.toContain("{{");
    expect(result.renderedText).toContain("\\{\\{");
  });

  it("serializes json variables", () => {
    const result = renderPrompt(
      "Extra: {{extra}}",
      versionId,
      definitions,
      { childName: "Ada", age: 7, extra: { key: "value" } },
    );
    expect(result.renderedText).toBe('Extra: \\{"key":"value"\\}');
  });

  it("estimates tokens from character count", () => {
    const result = renderPrompt(
      "Hello {{childName}}",
      versionId,
      [{ name: "childName", type: "string" }],
      { childName: "Ada" },
    );
    expect(result.tokenEstimate).toBe(Math.ceil(result.renderedText.length / 4));
  });

  it("handles unknown placeholders by leaving them unresolved", () => {
    const result = renderPrompt(
      "Hello {{childName}} and {{unknown}}",
      versionId,
      [{ name: "childName", type: "string" }],
      { childName: "Ada" },
    );
    expect(result.renderedText).toBe("Hello Ada and {{unknown}}");
  });
});
