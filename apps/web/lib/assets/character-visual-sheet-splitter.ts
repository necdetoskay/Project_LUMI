import {
  CHARACTER_VISUAL_VARIANTS,
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
}
