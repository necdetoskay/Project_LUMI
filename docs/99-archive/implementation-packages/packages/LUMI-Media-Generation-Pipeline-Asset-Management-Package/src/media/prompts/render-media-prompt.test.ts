import { describe, expect, it } from "vitest";
import { renderMediaPrompt } from "./render-media-prompt";

describe("media prompt renderer", () => {
  it("replaces nested variables", () => {
    const result = renderMediaPrompt(
      {
        code: "story-page",
        template:
          "{{character.name}} ormanda yürüyor",
      },
      {
        character: {
          name: "Lina",
        },
      },
    );

    expect(result.prompt).toBe(
      "Lina ormanda yürüyor",
    );
  });
});
