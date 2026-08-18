import { SCENE_NARRATIVE_MAX } from "./story-scene-output";

export type StoryLengthPreset = "short" | "medium" | "long" | "custom";

export interface StoryNarrativeTarget {
  preset: StoryLengthPreset;
  minCharacters: number;
  maxCharacters: number;
}

export const STORY_LENGTH_PRESETS: Readonly<
  Record<Exclude<StoryLengthPreset, "custom">, StoryNarrativeTarget>
> = {
  short: {
    preset: "short",
    minCharacters: 900,
    maxCharacters: 1300,
  },
  medium: {
    preset: "medium",
    minCharacters: 1500,
    maxCharacters: 2000,
  },
  long: {
    preset: "long",
    minCharacters: 2500,
    maxCharacters: 3500,
  },
};

export const STORY_CUSTOM_LENGTH_MIN = 600;
export const STORY_CUSTOM_LENGTH_MAX = SCENE_NARRATIVE_MAX;

export function resolveStoryNarrativeTarget(input?: {
  preset?: StoryLengthPreset;
  minCharacters?: number;
  maxCharacters?: number;
}): StoryNarrativeTarget {
  const preset = input?.preset ?? "medium";
  if (preset !== "custom") return STORY_LENGTH_PRESETS[preset];

  const minCharacters = input?.minCharacters;
  const maxCharacters = input?.maxCharacters;
  if (
    !Number.isInteger(minCharacters) ||
    !Number.isInteger(maxCharacters) ||
    minCharacters === undefined ||
    maxCharacters === undefined
  ) {
    throw new Error("STORY_CUSTOM_LENGTH_INTEGER_BOUNDS_REQUIRED");
  }
  if (
    minCharacters < STORY_CUSTOM_LENGTH_MIN ||
    maxCharacters > STORY_CUSTOM_LENGTH_MAX ||
    minCharacters > maxCharacters
  ) {
    throw new Error(
      `STORY_CUSTOM_LENGTH_OUT_OF_RANGE:${STORY_CUSTOM_LENGTH_MIN}-${STORY_CUSTOM_LENGTH_MAX}`,
    );
  }

  return {
    preset: "custom",
    minCharacters,
    maxCharacters,
  };
}
