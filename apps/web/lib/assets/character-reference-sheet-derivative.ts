import {
  CHARACTER_VISUAL_VARIANTS,
  type CharacterVisualDerivativePort,
} from "@lumi/profiles/application";

import { splitRasterRegions } from "./pure-raster-grid";

const SEVEN_VIEW_REGIONS = [
  { left: 0, top: 0, width: 0.25, height: 0.5 },
  { left: 0.25, top: 0, width: 0.25, height: 0.5 },
  { left: 0.5, top: 0, width: 0.25, height: 0.5 },
  { left: 0.75, top: 0, width: 0.25, height: 0.5 },
  { left: 0, top: 0.5, width: 1 / 3, height: 0.5 },
  { left: 1 / 3, top: 0.5, width: 1 / 3, height: 0.5 },
  { left: 2 / 3, top: 0.5, width: 1 / 3, height: 0.5 },
] as const;

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
