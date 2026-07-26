export type CharacterConsistencyProfile = {
  characterId: string;
  displayName: string;
  ageBand?: string;
  species?: string;
  hair?: string;
  eyes?: string;
  clothingSignature?: string;
  colorPaletteHints?: string[];
  distinguishingFeatures?: string[];
  styleTags?: string[];
  referenceAssetIds?: string[];
};

export function buildCharacterConsistencyPrompt(
  profile: CharacterConsistencyProfile,
): string {
  return [
    profile.displayName,
    profile.ageBand,
    profile.species,
    profile.hair,
    profile.eyes,
    profile.clothingSignature,
    ...(profile.colorPaletteHints ?? []),
    ...(profile.distinguishingFeatures ?? []),
    ...(profile.styleTags ?? []),
  ]
    .filter(Boolean)
    .join(", ");
}
