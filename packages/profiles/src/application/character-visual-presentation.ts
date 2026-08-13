import { and, eq } from "drizzle-orm";

import { characterVisualAssets } from "../db/schema/profile";
import { getProfileDb } from "./db";
import { getCharacterVisualCanon } from "./character-visual.service";

export const CHARACTER_VISUAL_PRESENTATION_ROLES = {
  portrait_primary: "head-front",
  full_body_front: "body-front",
} as const;

export type CharacterVisualPresentationRole =
  keyof typeof CHARACTER_VISUAL_PRESENTATION_ROLES;

export function getCharacterVisualVariantForRole(
  role: CharacterVisualPresentationRole,
) {
  return CHARACTER_VISUAL_PRESENTATION_ROLES[role];
}

export async function getCharacterVisualPresentationAsset(
  userId: string,
  householdId: string,
  characterId: string,
  role: CharacterVisualPresentationRole,
) {
  const canon = await getCharacterVisualCanon(userId, householdId, characterId);
  if (!canon?.selectedAssetId) return null;

  const variant = getCharacterVisualVariantForRole(role);
  const [derivative] = await getProfileDb()
    .select()
    .from(characterVisualAssets)
    .where(
      and(
        eq(characterVisualAssets.householdId, householdId),
        eq(characterVisualAssets.characterId, characterId),
        eq(characterVisualAssets.sourceCompositeAssetId, canon.selectedAssetId),
        eq(characterVisualAssets.assetKind, variant),
      ),
    )
    .limit(1);

  if (derivative) return derivative;

  const [selected] = await getProfileDb()
    .select()
    .from(characterVisualAssets)
    .where(
      and(
        eq(characterVisualAssets.id, canon.selectedAssetId),
        eq(characterVisualAssets.householdId, householdId),
        eq(characterVisualAssets.characterId, characterId),
      ),
    )
    .limit(1);

  if (selected?.assetKind === "character_portrait") return selected;
  return null;
}
