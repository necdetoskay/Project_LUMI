import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";

import { splitAssetSheetImage } from "@/lib/assets/asset-sheet-image";
import type { StoryVisualAssetSheetPlan } from "@lumi/media/application";

function createSheetPng() {
  const png = new PNG({ width: 800, height: 800 });
  for (let y = 0; y < 800; y += 1) {
    for (let x = 0; x < 800; x += 1) {
      const offset = (y * 800 + x) * 4;
      const quadrant = (y >= 400 ? 2 : 0) + (x >= 400 ? 1 : 0);
      const colors = [
        [255, 0, 0],
        [0, 255, 0],
        [0, 0, 255],
        [255, 255, 0],
      ];
      const color = colors[quadrant]!;
      png.data[offset] = color[0]!;
      png.data[offset + 1] = color[1]!;
      png.data[offset + 2] = color[2]!;
      png.data[offset + 3] = 255;
    }
  }
  return PNG.sync.write(png).toString("base64");
}

const plan: StoryVisualAssetSheetPlan = {
  sheetFingerprint: "a".repeat(64),
  compatibilityKey: "item:item-icon",
  columns: 2,
  rows: 2,
  outputMaxPx: 300,
  prompt: "test",
  cells: [0, 1, 2, 3].map((cellIndex) => ({
    requirementKey: `item:${cellIndex}`,
    prompt: `item ${cellIndex}`,
    renderFingerprint: String(cellIndex).padEnd(64, "f"),
    subjectId: `subject-${cellIndex}`,
    subjectType: "item" as const,
    assetKind: "item-icon",
    cellIndex,
    row: Math.floor(cellIndex / 2),
    column: cellIndex % 2,
  })),
};

describe("asset sheet image splitter", () => {
  it("crops ordered 2x2 cells and emits canonical <=300px PNG tiles", () => {
    const tiles = splitAssetSheetImage({
      plan,
      bytesBase64: createSheetPng(),
      mimeType: "image/png",
    });

    expect(tiles).toHaveLength(4);
    expect(tiles.every((tile) => tile.width === 300 && tile.height === 300)).toBe(
      true,
    );

    const expected = [
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [255, 255, 0],
    ];
    for (const tile of tiles) {
      const decoded = PNG.sync.read(Buffer.from(tile.bytesBase64, "base64"));
      expect(Array.from(decoded.data.subarray(0, 3))).toEqual(
        expected[tile.cellIndex],
      );
    }
  });
});
