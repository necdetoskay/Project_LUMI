import { describe, expect, it } from "vitest";

import {
  resolveStoryNarrativeTarget,
  STORY_CUSTOM_LENGTH_MAX,
  STORY_CUSTOM_LENGTH_MIN,
  STORY_LENGTH_PRESETS,
} from "../../src/application/story-length-policy";

describe("story length policy", () => {
  it("keeps the existing production target as the medium default", () => {
    expect(resolveStoryNarrativeTarget()).toEqual(STORY_LENGTH_PRESETS.medium);
    expect(STORY_LENGTH_PRESETS.medium).toMatchObject({
      minCharacters: 1500,
      maxCharacters: 2000,
    });
  });

  it("resolves short and long product presets", () => {
    expect(resolveStoryNarrativeTarget({ preset: "short" })).toEqual(
      STORY_LENGTH_PRESETS.short,
    );
    expect(resolveStoryNarrativeTarget({ preset: "long" })).toEqual(
      STORY_LENGTH_PRESETS.long,
    );
  });

  it("accepts bounded custom targets", () => {
    expect(
      resolveStoryNarrativeTarget({
        preset: "custom",
        minCharacters: 1100,
        maxCharacters: 1700,
      }),
    ).toEqual({
      preset: "custom",
      minCharacters: 1100,
      maxCharacters: 1700,
    });
  });

  it("rejects unsafe or malformed custom targets", () => {
    expect(() =>
      resolveStoryNarrativeTarget({
        preset: "custom",
        minCharacters: STORY_CUSTOM_LENGTH_MIN - 1,
        maxCharacters: 1200,
      }),
    ).toThrow(/OUT_OF_RANGE/);

    expect(() =>
      resolveStoryNarrativeTarget({
        preset: "custom",
        minCharacters: 1200,
        maxCharacters: STORY_CUSTOM_LENGTH_MAX + 1,
      }),
    ).toThrow(/OUT_OF_RANGE/);

    expect(() =>
      resolveStoryNarrativeTarget({
        preset: "custom",
        minCharacters: 1800,
        maxCharacters: 1200,
      }),
    ).toThrow(/OUT_OF_RANGE/);
  });
});
