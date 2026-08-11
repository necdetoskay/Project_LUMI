import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";

import { splitRasterGrid } from "@/lib/assets/pure-raster-grid";

describe("splitRasterGrid", () => {
  it("splits a PNG into deterministic equal cells without native modules", () => {
    const source = new PNG({ width: 384, height: 256 });
    for (let index = 0; index < source.data.length; index += 4) {
      source.data[index] = 20;
      source.data[index + 1] = 40;
      source.data[index + 2] = 60;
      source.data[index + 3] = 255;
    }

    const cells = splitRasterGrid({
      bytesBase64: PNG.sync.write(source).toString("base64"),
      mimeType: "image/png",
      columns: 3,
      rows: 2,
    });

    expect(cells).toHaveLength(6);
    expect(cells[5]).toMatchObject({
      mimeType: "image/png",
      width: 128,
      height: 128,
      crop: { left: 256, top: 128, width: 128, height: 128 },
    });
    const decoded = PNG.sync.read(Buffer.from(cells[0]!.bytesBase64, "base64"));
    expect([...decoded.data.subarray(0, 4)]).toEqual([20, 40, 60, 255]);
  });
});
