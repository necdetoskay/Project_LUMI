import {
  CHARACTER_VISUAL_VARIANTS,
  CHARACTER_VISUAL_EMOTION_VARIANTS,
  EXPRESSION_SHEET_REGIONS,
  SEVEN_VIEW_REGIONS,
  type CharacterVisualDerivativePort,
} from "@lumi/profiles/application";

import { splitRasterRegions } from "./pure-raster-grid";

export class PureJsCharacterReferenceSheetDerivativeAdapter
  implements CharacterVisualDerivativePort
{
  async splitReferenceSheet(
    input: Parameters<CharacterVisualDerivativePort["splitReferenceSheet"]>[0],
  ) {
    const cells = splitRasterRegions({
      ...input,
      regions: [...SEVEN_VIEW_REGIONS],
    });
    return CHARACTER_VISUAL_VARIANTS.map((variant, index) => ({
      variant,
      ...cells[index]!,
    }));
  }

  async splitExpressionSheet(input: { bytesBase64: string; mimeType: string }) {
    const cells = splitRasterRegions({
      ...input,
      regions: [...EXPRESSION_SHEET_REGIONS],
    });
    return CHARACTER_VISUAL_EMOTION_VARIANTS.map((variant, index) => ({
      variant,
      ...cells[index]!,
    }));
  }
}
