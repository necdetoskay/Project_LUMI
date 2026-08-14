import { CHARACTER_VISUAL_SHEET_LAYOUT_VERSION } from "./character-visual-sheet-layout";
import type { CharacterVisualVariant } from "./character-visual-generation";
import { resolveSemanticRole } from "./character-visual-derivative-resolver";

export type CharacterVisualDerivativeProvenance = {
  derivation: typeof CHARACTER_VISUAL_SHEET_LAYOUT_VERSION;
  sheetLayoutVersion: typeof CHARACTER_VISUAL_SHEET_LAYOUT_VERSION;
  semanticRole: ReturnType<typeof resolveSemanticRole>;
  variant: CharacterVisualVariant;
  sourceCompositeAssetId: string;
  briefVersion?: string;
  briefFingerprint?: string;
};

export type CharacterVisualSourceProvenance = {
  briefVersion?: string;
  briefFingerprint?: string;
  providerRequestId?: string | null;
  providerMetadata?: Record<string, unknown>;
  sheetLayoutVersion?: typeof CHARACTER_VISUAL_SHEET_LAYOUT_VERSION;
  derivedAssetIds?: string[];
};

export function buildDerivativeProvenance(input: {
  sourceCompositeAssetId: string;
  variant: CharacterVisualVariant;
  briefVersion?: string;
  briefFingerprint?: string;
}): CharacterVisualDerivativeProvenance {
  return {
    derivation: CHARACTER_VISUAL_SHEET_LAYOUT_VERSION,
    sheetLayoutVersion: CHARACTER_VISUAL_SHEET_LAYOUT_VERSION,
    semanticRole: resolveSemanticRole(input.variant),
    variant: input.variant,
    sourceCompositeAssetId: input.sourceCompositeAssetId,
    ...(input.briefVersion ? { briefVersion: input.briefVersion } : {}),
    ...(input.briefFingerprint
      ? { briefFingerprint: input.briefFingerprint }
      : {}),
  };
}
