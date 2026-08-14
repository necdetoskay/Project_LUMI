import { describe, expect, it } from "vitest";
import { validatePromptDraft } from "./prompt-management.validation";

const base = {
  systemTemplate: "You are LUMI.",
  userTemplate: "World: {{worldFeeling}}",
  allowedVariables: ["worldFeeling"],
  requiredVariables: ["worldFeeling"],
  outputSchema: { type: "object" },
};

describe("prompt management validation", () => {
  it("accepts a valid prompt draft", () => {
    expect(() => validatePromptDraft(base)).not.toThrow();
  });

  it("rejects an empty system template", () => {
    expect(() => validatePromptDraft({ ...base, systemTemplate: " " })).toThrow(
      "PROMPT_SYSTEM_TEMPLATE_REQUIRED",
    );
  });

  it("rejects required variables outside the allowlist", () => {
    expect(() =>
      validatePromptDraft({ ...base, requiredVariables: ["childAgeBand"] }),
    ).toThrow("PROMPT_REQUIRED_VARIABLE_NOT_ALLOWED:childAgeBand");
  });

  it("rejects template variables outside the allowlist", () => {
    expect(() =>
      validatePromptDraft({ ...base, userTemplate: "World: {{secretValue}}" }),
    ).toThrow("PROMPT_VARIABLE_NOT_ALLOWED:secretValue");
  });
});
