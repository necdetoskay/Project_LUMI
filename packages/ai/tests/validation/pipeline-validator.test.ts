import { describe, expect, it } from "vitest";

import { PipelineValidator } from "../../src/validation/pipeline-validator";

describe("PipelineValidator", () => {
  const validator = new PipelineValidator();

  it("accepts a schema-valid story scene", async () => {
    const report = await validator.validate(
      "story_scene",
      {
        sceneId: "scene:1",
        setting: "the whispering willow",
        characters: ["Luna"],
        narrative: "Luna found a glowing acorn and followed it home.",
        moment: "The acorn glowed brighter.",
        nextPrompt: "What will Luna do?",
      },
      { knownEntities: ["Luna"] },
    );
    expect(report.valid).toBe(true);
    expect(report.findings).toHaveLength(0);
  });

  it("flags schema errors", async () => {
    const report = await validator.validate("story_scene", {
      sceneId: "scene:1",
    });
    expect(report.valid).toBe(false);
    expect(report.findings.some((f) => f.kind === "schema")).toBe(true);
  });

  it("blocks unsafe content before approval", async () => {
    const report = await validator.validate("story_scene", {
      sceneId: "scene:bad",
      setting: "the basement",
      characters: ["Luna"],
      narrative: "A weapon was found under the stairs.",
      moment: "It was terrifying.",
      nextPrompt: "Run away?",
    });
    expect(report.valid).toBe(false);
    expect(report.findings.some((f) => f.kind === "safety")).toBe(true);
  });

  it("flags canon violations in origin candidates", async () => {
    const report = await validator.validate("origin_candidate", {
      packages: [
        {
          id: "origin:chosen",
          characterKind: "human",
          subtype: "the chosen one",
          originConcept: "You are the chosen one who saves the realm.",
          startingRegionArchetype: "old kingdom",
          startingLocation: "castle",
          homeArchetype: "tower",
          nearbyNpcSeed: "sage",
          firstMysterySeed: "the crown",
          toneVector: ["wonder"],
          noveltyMarkers: ["crown"],
          universeSeed: "u:1",
          candidateSeed: "u:1:candidate:0",
          score: 4,
        },
      ],
    });
    expect(report.valid).toBe(false);
    expect(report.findings.some((f) => f.kind === "canon")).toBe(true);
  });

  it("flags continuity errors when the scene contradicts known settings", async () => {
    const report = await validator.validate(
      "story_scene",
      {
        sceneId: "scene:contra",
        setting: "elsewhere",
        characters: ["Luna"],
        narrative: "Luna watched the whispering willow vanished.",
        moment: "Silence.",
        nextPrompt: "What next?",
      },
      {
        continuity: {
          knownEntities: ["Luna"],
          previousCharacterNames: ["Luna"],
          previousSettings: ["the whispering willow"],
          currentSceneText: "Luna watched the whispering willow vanished.",
        },
      },
    );
    expect(report.valid).toBe(false);
    expect(
      report.findings.some(
        (f) => f.kind === "continuity" && f.severity === "error",
      ),
    ).toBe(true);
  });

  it("treats only warnings as still valid", async () => {
    const report = await validator.validate(
      "story_scene",
      {
        sceneId: "scene:warn",
        setting: "the meadow",
        characters: ["Luna"],
        narrative:
          "A new character appeared with no connection to anyone known.",
        moment: "Hello.",
        nextPrompt: "Who is this?",
      },
      {
        continuity: {
          knownEntities: ["Luna"],
          previousCharacterNames: ["Luna"],
          previousSettings: ["the whispering willow"],
          currentSceneText:
            "A new character appeared with no connection to anyone known.",
        },
      },
    );
    expect(report.valid).toBe(true);
    expect(report.findings.some((f) => f.severity === "warning")).toBe(true);
  });
});
