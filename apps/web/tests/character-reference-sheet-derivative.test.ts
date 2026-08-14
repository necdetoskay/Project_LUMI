import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";

import { PureJsCharacterReferenceSheetDerivativeAdapter } from "@/lib/assets/character-reference-sheet-derivative";

describe("PureJsCharacterReferenceSheetDerivativeAdapter", () => {
  it("splits four full-body and three portrait regions in semantic order", async () => {
    const source = new PNG({ width: 1200, height: 800 });
    const adapter = new PureJsCharacterReferenceSheetDerivativeAdapter();

    const parts = await adapter.splitReferenceSheet({
      bytesBase64: PNG.sync.write(source).toString("base64"),
      mimeType: "image/png",
    });

    expect(parts.map((part) => part.variant)).toEqual([
      "body-front",
      "body-three-quarter",
      "body-side",
      "body-back",
      "head-front",
      "head-three-quarter",
      "head-side",
    ]);
    expect(parts.slice(0, 4).map((part) => [part.width, part.height])).toEqual(
      Array.from({ length: 4 }, () => [300, 400]),
    );
    expect(parts.slice(4).map((part) => [part.width, part.height])).toEqual(
      Array.from({ length: 3 }, () => [400, 400]),
    );
    expect(parts[1]?.crop).toEqual({
      left: 300,
      top: 0,
      width: 300,
      height: 400,
    });
    expect(parts[5]?.crop).toEqual({
      left: 400,
      top: 400,
      width: 400,
      height: 400,
    });
  });

  it("splits emotion sheets into four expression variants", async () => {
    const source = new PNG({ width: 800, height: 800 });
    const adapter = new PureJsCharacterReferenceSheetDerivativeAdapter();

    const parts = await adapter.splitExpressionSheet({
      bytesBase64: PNG.sync.write(source).toString("base64"),
      mimeType: "image/png",
    });

    expect(parts.map((part) => part.variant)).toEqual([
      "expression-happy",
      "expression-sad",
      "expression-surprised",
      "expression-scared",
    ]);
    expect(parts.map((part) => [part.width, part.height])).toEqual(
      Array.from({ length: 4 }, () => [400, 400]),
    );
  });
});
