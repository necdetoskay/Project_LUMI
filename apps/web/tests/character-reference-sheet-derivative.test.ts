import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { SharpCharacterReferenceSheetDerivativeAdapter } from "@/lib/assets/character-reference-sheet-derivative";

describe("SharpCharacterReferenceSheetDerivativeAdapter", () => {
  it("creates six equally sized semantic webp variants", async () => {
    const source = await sharp({
      create: {
        width: 900,
        height: 600,
        channels: 3,
        background: "#eee8ff",
      },
    })
      .png()
      .toBuffer();

    const variants =
      await new SharpCharacterReferenceSheetDerivativeAdapter().splitReferenceSheet(
        { bytesBase64: source.toString("base64"), mimeType: "image/png" },
      );

    expect(variants.map((entry) => entry.variant)).toEqual([
      "body-front",
      "body-side",
      "body-back",
      "head-front",
      "head-three-quarter",
      "head-side",
    ]);
    expect(variants).toHaveLength(6);
    expect(variants.every((entry) => entry.width === 300)).toBe(true);
    expect(variants.every((entry) => entry.height === 300)).toBe(true);
    expect(variants.every((entry) => entry.mimeType === "image/webp")).toBe(
      true,
    );
  });
});
