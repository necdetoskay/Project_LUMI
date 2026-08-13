import { describe, expect, it } from "vitest";

import {
  CHARACTER_VISUAL_SHEET_LAYOUT_VERSION,
  getSevenViewSheetLayout,
} from "../../src/application/character-visual-sheet-layout";

describe("character visual sheet layout", () => {
  it("defines seven normalized regions with versioned layout", () => {
    const layout = getSevenViewSheetLayout();

    expect(layout.version).toBe(CHARACTER_VISUAL_SHEET_LAYOUT_VERSION);
    expect(layout.regions).toHaveLength(7);
  });

  it("places four full-body regions in the top row", () => {
    const { regions } = getSevenViewSheetLayout();
    const topRow = regions.slice(0, 4);

    expect(topRow.map((region) => region.top)).toEqual([0, 0, 0, 0]);
    expect(topRow.map((region) => region.height)).toEqual([0.5, 0.5, 0.5, 0.5]);
    expect(topRow.map((region) => region.width)).toEqual([
      0.25, 0.25, 0.25, 0.25,
    ]);
    expect(topRow[0]?.left).toBe(0);
    expect(topRow[3]?.left).toBe(0.75);
  });

  it("places three portrait regions in the bottom row at one-third width", () => {
    const { regions } = getSevenViewSheetLayout();
    const bottomRow = regions.slice(4);

    expect(bottomRow.map((region) => region.top)).toEqual([0.5, 0.5, 0.5]);
    expect(bottomRow.map((region) => region.width)).toEqual([
      1 / 3,
      1 / 3,
      1 / 3,
    ]);
    expect(bottomRow[2]?.left).toBeCloseTo(2 / 3);
  });

  it("keeps every region within the normalized sheet bounds", () => {
    const { regions } = getSevenViewSheetLayout();
    for (const region of regions) {
      expect(region.left).toBeGreaterThanOrEqual(0);
      expect(region.top).toBeGreaterThanOrEqual(0);
      expect(region.left + region.width).toBeLessThanOrEqual(1);
      expect(region.top + region.height).toBeLessThanOrEqual(1);
    }
  });
});
