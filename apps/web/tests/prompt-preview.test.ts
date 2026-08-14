import { describe, expect, it } from "vitest";
import { previewPrompt } from "@/lib/prompts/prompt-preview";

describe("previewPrompt", () => {
  it("renders allowed nested variables", () => {
    const result = previewPrompt({ systemTemplate: "Hello {{child.name}}", userTemplate: "World: {{world}}", allowedVariables: ["child.name", "world"], requiredVariables: ["child.name"] }, { child: { name: "Lina" }, world: "Forest" });
    expect(result.system).toBe("Hello Lina"); expect(result.user).toBe("World: Forest"); expect(result.missingRequiredVariables).toEqual([]); expect(result.unknownTemplateVariables).toEqual([]);
  });
  it("reports missing and unknown variables", () => {
    const result = previewPrompt({ systemTemplate: "{{known}} {{unknown}}", userTemplate: "", allowedVariables: ["known"], requiredVariables: ["known"] }, {});
    expect(result.missingRequiredVariables).toEqual(["known"]); expect(result.unknownTemplateVariables).toEqual(["unknown"]);
  });
});
