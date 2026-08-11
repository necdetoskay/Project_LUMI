import sharp from "sharp";

import {
  CHARACTER_VISUAL_VARIANTS,
  type CharacterVisualDerivativePort,
} from "@lumi/profiles/application";

/**
 * Splits the contractually fixed 3x2 reference-sheet layout. Any remainder
 * pixels stay outside the cells so all six derivatives have identical size.
 */
export class SharpCharacterReferenceSheetDerivativeAdapter
  implements CharacterVisualDerivativePort
{
  async splitReferenceSheet(
    input: Parameters<CharacterVisualDerivativePort["splitReferenceSheet"]>[0],
  ) {
    const source = Buffer.from(input.bytesBase64, "base64");
    const metadata = await sharp(source).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error("REFERENCE_SHEET_DIMENSIONS_MISSING");
    }

    const cellWidth = Math.floor(metadata.width / 3);
    const cellHeight = Math.floor(metadata.height / 2);
    if (cellWidth < 128 || cellHeight < 128) {
      throw new Error("REFERENCE_SHEET_TOO_SMALL");
    }

    return Promise.all(
      CHARACTER_VISUAL_VARIANTS.map(async (variant, index) => {
        const crop = {
          left: (index % 3) * cellWidth,
          top: Math.floor(index / 3) * cellHeight,
          width: cellWidth,
          height: cellHeight,
        };
        const bytes = await sharp(source)
          .extract(crop)
          .webp({ quality: 90 })
          .toBuffer();
        return {
          variant,
          bytesBase64: bytes.toString("base64"),
          mimeType: "image/webp",
          width: cellWidth,
          height: cellHeight,
          crop,
        };
      }),
    );
  }
}
