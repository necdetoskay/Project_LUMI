import { describe, expect, it } from "vitest";

import {
  CHARACTER_ONBOARDING_SCENARIO,
  onboardingTestablePhases,
} from "../src/test-lab/domain/character-onboarding-scenario";
import { phaseIsRunnable } from "../src/test-lab/domain/test-scenario";

describe("Character Onboarding Test Lab scenario", () => {
  it("maps the character-first generation phases to production prompts", () => {
    const prompts = Object.fromEntries(
      onboardingTestablePhases()
        .filter((phase) => phase.directions.includes("character_first"))
        .map((phase) => [phase.id, phase.promptKey]),
    );

    expect(prompts).toMatchObject({
      character_first_identity_suggestions:
        "character_onboarding.character_first_identity_suggestions",
      world_suggestions: "character_onboarding.world_suggestions",
      compatibility: "character_onboarding.compatibility",
      region_suggestions: "character_onboarding.region_suggestions",
      origin_suggestions: "character_onboarding.character_origin_suggestions",
      core_saga: "character_onboarding.core_saga",
    });
  });

  it("does not expose final review as a world-first phase until production is canonical", () => {
    const finalReview = CHARACTER_ONBOARDING_SCENARIO.phases.find(
      (phase) => phase.id === "final_review",
    );

    expect(finalReview?.directions).toEqual(["character_first"]);
  });

  it("requires selected upstream state before a later phase becomes runnable", () => {
    const world = CHARACTER_ONBOARDING_SCENARIO.phases.find(
      (phase) => phase.id === "world_suggestions",
    );
    if (!world) throw new Error("WORLD_PHASE_REQUIRED");

    expect(
      phaseIsRunnable(world, {
        direction: "character_first",
        state: { characterIdentity: { key: "identity-a" } },
      }),
    ).toBe(false);
    expect(
      phaseIsRunnable(world, {
        direction: "character_first",
        state: {
          characterIdentity: { key: "identity-a" },
          universe: { key: "universe-a" },
        },
      }),
    ).toBe(true);
  });
});
