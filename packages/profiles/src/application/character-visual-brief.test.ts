import { describe, expect, it } from "vitest";

import {
  buildCharacterVisualBrief,
  fingerprintCharacterVisualBrief,
} from "./character-visual-brief";

const source = {
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
};

describe("character visual brief", () => {
  it("produces a stable fingerprint for unchanged canonical data", () => {
    const first = buildCharacterVisualBrief(source);
    const second = buildCharacterVisualBrief({
      ...source,
      safetyBounds: { intensity: "gentle" },
      preferenceHints: { palette: ["gold", "green"], motif: "fireflies" },
    });

    expect(fingerprintCharacterVisualBrief(first)).toBe(
      fingerprintCharacterVisualBrief(second),
    );
  });

  it("changes the fingerprint when identity-relevant data changes", () => {
    const first = buildCharacterVisualBrief(source);
    const changed = buildCharacterVisualBrief({
      ...source,
      originConcept: "Yıldızları izleyen meraklı bir kaşif",
    });

    expect(fingerprintCharacterVisualBrief(first)).not.toBe(
      fingerprintCharacterVisualBrief(changed),
    );
  });
});
