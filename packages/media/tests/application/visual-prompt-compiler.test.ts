import { describe, expect, it } from "vitest";

import { compileVisualPrompt } from "../../src/application";
import { getItemVisualStates } from "../../src/domain";

describe("compileVisualPrompt", () => {
  it("hard-isolates item generation from character output", () => {
    const states = getItemVisualStates("compass");
    const result = compileVisualPrompt({
      assetType: "item",
      styleId: "lumi-storybook",
      identity: [
        "Parlayan Pusula",
        "small round brass compass",
        "dark green lid",
        "golden needle",
      ],
      states,
    });

    expect(result.stateIds).toEqual(["closed", "open"]);
    expect(result.prompt).toContain("SUBJECT TYPE: ITEM / OBJECT");
    expect(result.prompt).toContain("Do not generate people, children, characters");
    expect(result.prompt).toContain("exact same object identity");
    expect(result.prompt).toContain("no text");
    expect(result.prompt).toContain("no logo");
    expect(result.prompt).toContain("no watermark");
    expect(result.prompt).toContain("Do not write state names");
  });

  it("keeps the chosen style and version explicit in provenance-ready output", () => {
    const result = compileVisualPrompt({
      assetType: "item",
      styleId: "paper-cut-world",
      styleVersion: 1,
      identity: ["small red backpack"],
      states: getItemVisualStates("bag"),
    });
    expect(result.styleId).toBe("paper-cut-world");
    expect(result.styleVersion).toBe(1);
    expect(result.prompt).toContain("STYLE PROFILE: paper-cut-world v1");
  });

  it("rejects more than four states in one grid", () => {
    expect(() =>
      compileVisualPrompt({
        assetType: "item",
        styleId: "lumi-storybook",
        identity: ["test item"],
        states: Array.from({ length: 5 }, (_, index) => ({
          id: `${index}`,
          label: `${index}`,
          prompt: `state ${index}`,
        })),
      }),
    ).toThrow("VISUAL_STATE_GRID_TOO_LARGE");
  });
});
