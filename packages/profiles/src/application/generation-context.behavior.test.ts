import { beforeEach, describe, expect, it, vi } from "vitest";

import { assembleGenerationContext, toPromptGenerationContext } from "./generation-context-assembler";
import { buildGenerationContext } from "./generation-context.service";
import { findChildProfileForUser } from "./child-profile.service";
import { getChildPersonalization } from "./child-profile-personalization.service";
import { getActiveCharacterCreationCycle } from "./character-creation-cycle.service";

vi.mock("./child-profile.service", () => ({
  findChildProfileForUser: vi.fn(),
}));
vi.mock("./child-profile-personalization.service", () => ({
  getChildPersonalization: vi.fn(),
}));
vi.mock("./character-creation-cycle.service", () => ({
  getActiveCharacterCreationCycle: vi.fn(),
}));

const findChild = vi.mocked(findChildProfileForUser);
const getPersonalization = vi.mocked(getChildPersonalization);
const getCycle = vi.mocked(getActiveCharacterCreationCycle);

beforeEach(() => {
  vi.resetAllMocks();
  findChild.mockResolvedValue({
    id: "child-1",
    ageBand: "6-8",
    locale: "tr-TR",
  } as Awaited<ReturnType<typeof findChildProfileForUser>>);
  getPersonalization.mockResolvedValue({
    interests: ["space", "animals"],
    customInterests: ["crystals"],
    developmentGoals: ["curiosity"],
  } as Awaited<ReturnType<typeof getChildPersonalization>>);
  getCycle.mockResolvedValue({
    id: "cycle-1",
    startDirection: "world_first",
    latestSummary: {
      worldFeeling: "crystal_caves",
      characterArchetype: "curious_explorer",
    },
  } as Awaited<ReturnType<typeof getActiveCharacterCreationCycle>>);
});

describe("generation context behavior", () => {
  it("builds and assembles onboarding context without leaking unrelated sections", async () => {
    const context = await buildGenerationContext("user-1", {
      householdId: "household-1",
      childProfileId: "child-1",
      profile: "character_onboarding",
    });

    const assembled = assembleGenerationContext(context);
    const promptContext = toPromptGenerationContext(assembled);

    expect(context.child).toEqual({
      id: "child-1",
      ageBand: "6-8",
      locale: "tr-TR",
      interests: ["space", "animals"],
      customInterests: ["crystals"],
      developmentGoals: ["curiosity"],
    });
    expect(context.creation.previousSelections).toEqual({
      worldFeeling: "crystal_caves",
      characterArchetype: "curious_explorer",
    });
    expect(assembled.maxContextTokens).toBe(1800);
    expect(Object.keys(promptContext)).toEqual([
      "child_identity",
      "child_personalization",
      "creation_direction",
      "creation_selections",
    ]);
    expect(promptContext).not.toHaveProperty("world_state");
    expect(promptContext).not.toHaveProperty("recent_story_state");
    expect(promptContext).not.toHaveProperty("relevant_memories");
  });

  it("keeps required story continuity sections explicit even before their providers are implemented", async () => {
    const context = await buildGenerationContext("user-1", {
      householdId: "household-1",
      childProfileId: "child-1",
      profile: "story_generation",
    });

    const promptContext = toPromptGenerationContext(
      assembleGenerationContext(context),
    );

    expect(promptContext).toMatchObject({
      child_identity: {
        id: "child-1",
        ageBand: "6-8",
        locale: "tr-TR",
      },
      child_personalization: {
        interests: ["space", "animals"],
        customInterests: ["crystals"],
        developmentGoals: ["curiosity"],
      },
      character_state: null,
    });
    expect(promptContext).not.toHaveProperty("world_state");
    expect(promptContext).not.toHaveProperty("recent_story_state");
    expect(promptContext).not.toHaveProperty("relevant_memories");
  });

  it("fails before producing generation context when the child is outside the authorized scope", async () => {
    findChild.mockResolvedValueOnce(null);

    await expect(
      buildGenerationContext("user-1", {
        householdId: "household-1",
        childProfileId: "child-1",
        profile: "character_onboarding",
      }),
    ).rejects.toThrow("Child profile not found");
  });

  it("uses an empty selection set when there is no active creation cycle", async () => {
    getCycle.mockResolvedValueOnce(null);

    const context = await buildGenerationContext("user-1", {
      householdId: "household-1",
      childProfileId: "child-1",
      profile: "character_onboarding",
    });

    expect(context.creation).toEqual({
      cycleId: null,
      startDirection: null,
      previousSelections: {},
    });
    expect(
      toPromptGenerationContext(assembleGenerationContext(context)),
    ).not.toHaveProperty("creation_selections");
  });
});
