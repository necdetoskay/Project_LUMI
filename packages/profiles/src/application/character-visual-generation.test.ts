import { describe, expect, it } from "vitest";

import { buildCharacterVisualBrief } from "./character-visual-brief";
import { renderCharacterVisualPrompt } from "./character-visual-generation";

const brief = buildCharacterVisualBrief({
  characterId: "51000000-0000-4000-8000-000000000020",
  householdId: "51000000-0000-4000-8000-000000000001",
  name: "Lina",
  broadKind: "human",
  characterType: "explorer",
  subtype: "child",
  originConcept: "Işığı merak eden cesur bir kaşif",
  startingRegionArchetype: "enchanted_forest",
  startingLocation: "Fısıldayan Orman",
  homeArchetype: "cozy_forest_home",
  lifecycleStage: "childhood",
  safetyBounds: { intensity: "gentle" },
  preferenceHints: { motif: "fireflies", palette: ["gold", "green"] },
});

describe("character visual generation prompt", () => {
  it("combines the seven-view layout with premium storybook art direction", () => {
    const prompt = renderCharacterVisualPrompt(brief, "reference-sheet");

    expect(prompt).toContain("exactly four equal-width full-body views");
    expect(prompt).toContain("exactly three equal-width half-body portraits");
    expect(prompt).toContain("crisp, confident silhouettes");
    expect(prompt).toContain("gouache-and-watercolor surface texture");
    expect(prompt).toContain("high-end animated-feature concept art");
    expect(prompt).toContain("not a rough sketch");
  });
});
