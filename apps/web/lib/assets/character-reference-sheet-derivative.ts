import {
  CHARACTER_VISUAL_VARIANTS,
  type CharacterVisualDerivativePort,
} from "@lumi/profiles/application";

import { splitRasterGrid } from "./pure-raster-grid";

export class PureJsCharacterReferenceSheetDerivativeAdapter
  implements CharacterVisualDerivativePort
{
  async splitReferenceSheet(
    input: Parameters<CharacterVisualDerivativePort["splitReferenceSheet"]>[0],
  ) {
    const cells = splitRasterGrid({ ...input, columns: 3, rows: 2 });
    return CHARACTER_VISUAL_VARIANTS.map((variant, index) => ({
      variant,
      ...cells[index]!,
    }));
  }
}
