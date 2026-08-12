import { describe, expect, it } from "vitest";

import {
  planStoryVisualAssetSheets,
  type StoryVisualRenderTarget,
} from "../../src/domain";

function target(input: {
  manifestEntityId: string;
  stateId?: string;
  variantId?: string;
  fingerprint: string;
}): StoryVisualRenderTarget {
  return {
    manifestEntityId: input.manifestEntityId,
    resolvedEntityId: input.manifestEntityId,
    variant: input.variantId
      ? {
          id: input.variantId,
          kind: "outfit",
          label: input.variantId,
          traits: [input.variantId],
        }
      : null,
    state: input.stateId
      ? { id: input.stateId, label: input.stateId }
      : null,
    renderFingerprint: input.fingerprint,
  };
}

describe("story visual asset sheet planner", () => {
  it("keeps related states of the same entity together when they fit", () => {
    const plan = planStoryVisualAssetSheets({
      targets: [
        target({ manifestEntityId: "potion", stateId: "full", fingerprint: "a" }),
        target({ manifestEntityId: "potion", stateId: "half", fingerprint: "b" }),
        target({ manifestEntityId: "potion", stateId: "empty", fingerprint: "c" }),
        target({ manifestEntityId: "key", fingerprint: "d" }),
      ],
      styleId: "lumi-storybook",
      styleVersion: 1,
      maxPanelsPerSheet: 4,
    });

    expect(plan.sheets).toHaveLength(1);
    expect(plan.sheets[0]?.panels.map((panel) => panel.target.renderFingerprint)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
    expect(plan.sheets[0]?.rows).toBe(2);
    expect(plan.sheets[0]?.columns).toBe(2);
  });

  it("packs multiple entities while moving an intact group to the next sheet", () => {
    const plan = planStoryVisualAssetSheets({
      targets: [
        target({ manifestEntityId: "compass", stateId: "closed", fingerprint: "a" }),
        target({ manifestEntityId: "compass", stateId: "open", fingerprint: "b" }),
        target({ manifestEntityId: "candle", stateId: "unlit", fingerprint: "c" }),
        target({ manifestEntityId: "candle", stateId: "lit", fingerprint: "d" }),
        target({ manifestEntityId: "candle", stateId: "burned", fingerprint: "e" }),
      ],
      styleId: "lumi-storybook",
      styleVersion: 1,
      maxPanelsPerSheet: 4,
    });

    expect(plan.sheets).toHaveLength(2);
    expect(plan.sheets[0]?.panels.map((panel) => panel.target.manifestEntityId)).toEqual([
      "compass",
      "compass",
    ]);
    expect(plan.sheets[1]?.panels.map((panel) => panel.target.manifestEntityId)).toEqual([
      "candle",
      "candle",
      "candle",
    ]);
    expect(plan.splitGroupCount).toBe(0);
  });

  it("splits one oversized entity group only when unavoidable", () => {
    const targets = Array.from({ length: 5 }, (_, index) =>
      target({
        manifestEntityId: "artifact",
        stateId: `state-${index + 1}`,
        fingerprint: `fp-${index + 1}`,
      }),
    );

    const plan = planStoryVisualAssetSheets({
      targets,
      styleId: "lumi-storybook",
      styleVersion: 1,
      maxPanelsPerSheet: 4,
    });

    expect(plan.sheets.map((sheet) => sheet.panels.length)).toEqual([4, 1]);
    expect(plan.splitGroupCount).toBe(1);
  });

  it("prioritizes critical entities while preserving deterministic order inside a priority", () => {
    const plan = planStoryVisualAssetSheets({
      targets: [
        target({ manifestEntityId: "support-a", fingerprint: "a" }),
        target({ manifestEntityId: "critical-a", fingerprint: "b" }),
        target({ manifestEntityId: "critical-b", fingerprint: "c" }),
        target({ manifestEntityId: "support-b", fingerprint: "d" }),
      ],
      styleId: "lumi-storybook",
      styleVersion: 1,
      maxPanelsPerSheet: 4,
      importanceByManifestEntityId: {
        "support-a": "supporting",
        "critical-a": "critical",
        "critical-b": "critical",
        "support-b": "supporting",
      },
    });

    expect(plan.sheets[0]?.panels.map((panel) => panel.target.manifestEntityId)).toEqual([
      "critical-a",
      "critical-b",
      "support-a",
      "support-b",
    ]);
  });

  it("keeps variants of the same character as separate visual groups", () => {
    const plan = planStoryVisualAssetSheets({
      targets: [
        target({ manifestEntityId: "mira", variantId: "desert-light", fingerprint: "a" }),
        target({ manifestEntityId: "mira", variantId: "mountain-winter", fingerprint: "b" }),
      ],
      styleId: "lumi-storybook",
      styleVersion: 1,
      maxPanelsPerSheet: 1,
    });

    expect(plan.sheets).toHaveLength(2);
    expect(plan.sheets[0]?.panels[0]?.target.variant?.id).toBe("desert-light");
    expect(plan.sheets[1]?.panels[0]?.target.variant?.id).toBe("mountain-winter");
  });

  it("rejects duplicate render targets and unsafe panel limits", () => {
    const duplicateTargets = [
      target({ manifestEntityId: "compass", stateId: "open", fingerprint: "same" }),
      target({ manifestEntityId: "compass", stateId: "closed", fingerprint: "same" }),
    ];

    expect(() =>
      planStoryVisualAssetSheets({
        targets: duplicateTargets,
        styleId: "lumi-storybook",
        styleVersion: 1,
      }),
    ).toThrow("STORY_VISUAL_SHEET_DUPLICATE_RENDER_TARGET");

    expect(() =>
      planStoryVisualAssetSheets({
        targets: [],
        styleId: "lumi-storybook",
        styleVersion: 1,
        maxPanelsPerSheet: 17,
      }),
    ).toThrow("STORY_VISUAL_SHEET_MAX_PANELS_INVALID");
  });
});
