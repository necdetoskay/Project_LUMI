import { describe, expect, it } from "vitest";

import {
  DEFAULT_VISUAL_STYLE_ID,
  getItemVisualStates,
  getVisualStyleProfile,
  planItemStateGrid,
  VISUAL_STYLE_CATALOG,
} from "../../src/domain";

describe("visual style catalog", () => {
  it("ships a small versioned starter catalog with a stable default", () => {
    expect(VISUAL_STYLE_CATALOG).toHaveLength(6);
    const profile = getVisualStyleProfile(DEFAULT_VISUAL_STYLE_ID);
    expect(profile.id).toBe("lumi-storybook");
    expect(profile.version).toBe(1);
    expect(profile.negativePrompt).toEqual(
      expect.arrayContaining(["no text", "no logo", "no watermark"]),
    );
  });

  it("fails closed for an unknown version", () => {
    expect(() => getVisualStyleProfile("lumi-storybook", 99)).toThrow(
      "VISUAL_STYLE_NOT_FOUND",
    );
  });
});

describe("item visual states", () => {
  it("treats a bag as an item with open and closed states", () => {
    expect(getItemVisualStates("bag").map((state) => state.id)).toEqual([
      "closed",
      "open",
    ]);
  });

  it("provides semantic states for common interactive objects", () => {
    expect(getItemVisualStates("potion").map((state) => state.id)).toEqual([
      "full",
      "half",
      "empty",
    ]);
    expect(getItemVisualStates("candle").map((state) => state.id)).toEqual([
      "unlit",
      "lit",
      "burned-down",
    ]);
  });

  it("falls back to one default state for unknown categories", () => {
    expect(
      getItemVisualStates("mysterious-widget").map((state) => state.id),
    ).toEqual(["default"]);
  });

  it("plans at most four state panels per generation", () => {
    const states = Array.from({ length: 7 }, (_, index) => ({
      id: `s${index}`,
      label: `S${index}`,
      prompt: `state ${index}`,
    }));
    expect(planItemStateGrid(states).map((batch) => batch.length)).toEqual([
      4, 3,
    ]);
  });
});
