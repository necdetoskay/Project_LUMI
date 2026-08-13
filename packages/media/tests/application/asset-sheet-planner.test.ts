import { describe, expect, it } from "vitest";

import {
  planStoryVisualAssetSheets,
  STORY_VISUAL_SHEET_OUTPUT_MAX_PX,
} from "../../src/application/asset-sheet-planner";

const item = (key: string) => ({
  requirementKey: key,
  prompt: `Render ${key}`,
  renderFingerprint: key.padEnd(64, "a"),
  subjectId: `item-${key}`,
  subjectType: "item" as const,
  assetKind: "item-icon",
});

const environment = (key: string) => ({
  requirementKey: key,
  prompt: `Render ${key}`,
  renderFingerprint: key.padEnd(64, "b"),
  subjectId: `env-${key}`,
  subjectType: "location" as const,
  assetKind: "environment-render",
});

describe("story visual asset sheet planner", () => {
  it("batches compatible item requirements into ordered 2x2 sheets", () => {
    const plans = planStoryVisualAssetSheets([
      item("bag:closed"),
      item("bag:open"),
      item("potion:full"),
      item("potion:empty"),
      item("compass:open"),
    ]);

    expect(plans).toHaveLength(1);
    expect(plans[0]?.cells).toHaveLength(4);
    expect(plans[0]?.cells.map((cell) => cell.requirementKey)).toEqual([
      "bag:closed",
      "bag:open",
      "potion:full",
      "potion:empty",
    ]);
    expect(plans[0]?.cells.map((cell) => [cell.row, cell.column])).toEqual([
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ]);
    expect(plans[0]?.outputMaxPx).toBe(STORY_VISUAL_SHEET_OUTPUT_MAX_PX);
  });

  it("keeps item and environment sheets separate and leaves singletons for direct generation", () => {
    const plans = planStoryVisualAssetSheets([
      item("compass:closed"),
      item("compass:open"),
      environment("cave:day"),
      environment("cave:night"),
      environment("forest:fog"),
      {
        ...item("hero:winter"),
        subjectType: "character" as const,
        assetKind: "character-story-render",
      },
    ]);

    expect(plans).toHaveLength(2);
    expect(plans[0]?.compatibilityKey).toBe("item:item-icon");
    expect(plans[0]?.cells).toHaveLength(2);
    expect(plans[1]?.compatibilityKey).toBe(
      "environment:environment-render",
    );
    expect(plans[1]?.cells).toHaveLength(3);
    expect(plans.flatMap((plan) => plan.cells)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ requirementKey: "hero:winter" }),
      ]),
    );
  });

  it("produces stable provenance fingerprints for the same ordered cells", () => {
    const candidates = [item("bag:closed"), item("bag:open")];
    const first = planStoryVisualAssetSheets(candidates)[0];
    const second = planStoryVisualAssetSheets(candidates)[0];

    expect(first?.sheetFingerprint).toBe(second?.sheetFingerprint);
    expect(first?.prompt).toContain("CELL 1");
    expect(first?.prompt).toContain("CELL 2");
    expect(first?.prompt).toContain("unused cells");
  });
});
