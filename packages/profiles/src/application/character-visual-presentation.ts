import { and, eq } from "drizzle-orm";

import { characterVisualAssets } from "../db/schema/profile";
import { getProfileDb } from "./db";
import { getCharacterVisualCanon } from "./character-visual.service";
import {
  resolveVariantForRole,
  type CharacterVisualSemanticRole,
} from "./character-visual-derivative-resolver";

export type CharacterVisualPresentationRole = Extract<
  CharacterVisualSemanticRole,
  "portrait_primary" | "full_body_front"
>;

export const CHARACTER_VISUAL_PRESENTATION_ROLES: Record<
  CharacterVisualPresentationRole,
  string
> = {
  portrait_primary: resolveVariantForRole("portrait_primary"),
  full_body_front: resolveVariantForRole("full_body_front"),
};

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
