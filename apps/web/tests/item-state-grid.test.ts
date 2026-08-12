import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";

import { splitItemStateGrid } from "../lib/assets/item-state-grid";

function makeTwoPanelPng() {
  const png = new PNG({ width: 800, height: 400 });
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const offset = (y * png.width + x) * 4;
      const left = x < 400;
      png.data[offset] = left ? 240 : 20;
      png.data[offset + 1] = left ? 20 : 220;
      png.data[offset + 2] = 30;
      png.data[offset + 3] = 255;
    }
  }
  return PNG.sync.write(png).toString("base64");
}

describe("splitItemStateGrid", () => {
  it("splits a two-state horizontal grid and caps each state at 300px", () => {
    const panels = splitItemStateGrid({
      bytesBase64: makeTwoPanelPng(),
      mimeType: "image/png",
      stateIds: ["closed", "open"],
      maxOutputSize: 300,
    });

    expect(panels.map((panel) => panel.stateId)).toEqual(["closed", "open"]);
    expect(panels.every((panel) => panel.width === 300 && panel.height === 300)).toBe(true);
    expect(panels.every((panel) => panel.mimeType === "image/png")).toBe(true);

    const closed = PNG.sync.read(Buffer.from(panels[0]!.bytesBase64, "base64"));
    const open = PNG.sync.read(Buffer.from(panels[1]!.bytesBase64, "base64"));
    expect(closed.data[0]).toBeGreaterThan(200);
    expect(closed.data[1]).toBeLessThan(80);
    expect(open.data[0]).toBeLessThan(80);
    expect(open.data[1]).toBeGreaterThan(180);
  });

  it("rejects unsupported provider image types instead of storing an unsplit grid", () => {
    expect(() =>
      splitItemStateGrid({
        bytesBase64: "AAAA",
        mimeType: "image/webp",
        stateIds: ["default"],
      }),
    ).toThrow("ITEM_STATE_GRID_MIME_UNSUPPORTED");
  });
});
