import type { CreateChoicePointServiceInput } from "../../src/application/choice/choice.service";

export function createStaticChoiceFixture(storyVersionId: string, sceneId: string): CreateChoicePointServiceInput {
  return {
    storyVersionId,
    sceneId,
    choicePointKey: "static-continue",
    choicePointType: "single",
    promptText: "Continue the story?",
    options: [
      {
        optionKey: "continue",
        optionText: "Continue",
      },
    ],
  };
}

export function createInteractiveConditionalFixture(
  storyVersionId: string,
  sceneId: string,
): CreateChoicePointServiceInput {
  return {
    storyVersionId,
    sceneId,
    choicePointKey: "crossroads",
    choicePointType: "conditional",
    promptText: "Which path do you take?",
    options: [
      {
        optionKey: "forest",
        optionText: "Enter the dark forest",
        availabilityRule: {
          ruleId: "needs-brave-flag",
          version: 1,
          conditions: [{ path: "flags.brave", operator: "has_flag", value: true }],
        },
        consequencePreviews: [
          {
            consequenceType: "scene_transition",
            previewText: "You step into the shadows of the forest",
          },
        ],
      },
      {
        optionKey: "village",
        optionText: "Walk to the village",
      },
    ],
  };
}

export function createCommittedChoiceChainFixture(
  storySessionId: string,
  choicePointId: string,
  optionId: string,
  evidenceSceneId: string,
) {
  return {
    storySessionId,
    choicePointId,
    optionId,
    evidenceSceneId,
    ruleVersion: 1,
  };
}
