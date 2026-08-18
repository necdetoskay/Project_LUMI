import type {
  TestPhaseDefinition,
  TestScenarioDefinition,
} from "./test-scenario";

export const STORY_GENERATION_SCENARIO_KEY = "story_generation";
export const STORY_GENERATION_OPERATION = "generateStoryCandidate";
export const STORY_PHASE_PREFIX = "story_";
export const STORY_PHASE_MAX = 999;

export function storyPhaseId(storyNumber: number): string {
  assertStoryNumber(storyNumber);
  return `${STORY_PHASE_PREFIX}${String(storyNumber).padStart(3, "0")}`;
}

export function storyNumberFromPhaseId(phaseId: string): number | null {
  const match = /^story_(\d{3})$/.exec(phaseId);
  if (!match) return null;
  const storyNumber = Number(match[1]);
  if (!Number.isInteger(storyNumber) || storyNumber < 1) return null;
  return storyNumber;
}

export function createStoryGenerationPhase(
  storyNumber: number,
): TestPhaseDefinition {
  const id = storyPhaseId(storyNumber);
  return {
    id,
    label: `Story ${storyNumber}`,
    kind: "generation",
    llmBacked: true,
    testable: true,
    productionOperation: STORY_GENERATION_OPERATION,
    promptKey: null,
    directions: ["story"],
    requiredStateKeys: ["storyLab.worldId", "storyLab.sourceTitle"],
    writesStateKey: `storyLab.stories.${storyNumber - 1}`,
  };
}

export function createStoryGenerationScenario(
  storyCount: number,
): TestScenarioDefinition {
  assertStoryNumber(storyCount);
  return {
    key: STORY_GENERATION_SCENARIO_KEY,
    label: "Story Generation",
    phases: Array.from({ length: storyCount }, (_, index) =>
      createStoryGenerationPhase(index + 1),
    ),
  };
}

function assertStoryNumber(storyNumber: number): void {
  if (
    !Number.isInteger(storyNumber) ||
    storyNumber < 1 ||
    storyNumber > STORY_PHASE_MAX
  ) {
    throw new Error(`TEST_LAB_INVALID_STORY_NUMBER:${storyNumber}`);
  }
}
