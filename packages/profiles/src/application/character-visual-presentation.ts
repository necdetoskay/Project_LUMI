import { and, eq, isNull, or } from "drizzle-orm";

import { characterVisualAssets } from "../db/schema/profile";
import { getProfileDb } from "./db";
import { getCharacterVisualCanon } from "./character-visual.service";
import {
  resolveVariantForRole,
  type CharacterVisualSemanticRole,
} from "./character-visual-derivative-resolver";

export type CharacterVisualPresentationRole =
  | Extract<CharacterVisualSemanticRole, "portrait_primary" | "full_body_front">
  | "header_card";

export const CHARACTER_VISUAL_PRESENTATION_ROLES: Record<
  Exclude<CharacterVisualPresentationRole, "header_card">,
  string
> = {
  portrait_primary: resolveVariantForRole("portrait_primary"),
  full_body_front: resolveVariantForRole("full_body_front"),
};

export function getCharacterVisualVariantForRole(
  role: CharacterVisualPresentationRole,
) {
  if (role === "header_card") return null;
  return CHARACTER_VISUAL_PRESENTATION_ROLES[role];
}

export async function getCharacterVisualPresentationAsset(
  userId: string,
  householdId: string,
  characterId: string,
  role: CharacterVisualPresentationRole,
) {
  const canon = await getCharacterVisualCanon(userId, householdId, characterId);
  const selectedAssetId =
    role === "header_card"
      ? (canon?.selectedHeaderAssetId ??
        canon?.selectedHalfBodyAssetId ??
        canon?.selectedAssetId)
      : role === "full_body_front"
        ? (canon?.selectedFullBodyAssetId ?? canon?.selectedAssetId)
        : (canon?.selectedHalfBodyAssetId ?? canon?.selectedAssetId);
  if (!selectedAssetId) return null;

  if (role === "header_card") {
    const [headerAsset] = await getProfileDb()
      .select()
      .from(characterVisualAssets)
      .where(
        and(
          eq(characterVisualAssets.id, selectedAssetId),
          eq(characterVisualAssets.householdId, householdId),
          eq(characterVisualAssets.characterId, characterId),
          isNull(characterVisualAssets.deletedAt),
        ),
      )
      .limit(1);
    if (headerAsset) return headerAsset;
  }

  const variant =
    role === "header_card"
      ? CHARACTER_VISUAL_PRESENTATION_ROLES.full_body_front
      : getCharacterVisualVariantForRole(role);
  if (!variant) return null;
  const [derivative] = await getProfileDb()
    .select()
    .from(characterVisualAssets)
    .where(
      and(
        eq(characterVisualAssets.householdId, householdId),
        eq(characterVisualAssets.characterId, characterId),
        or(
          eq(characterVisualAssets.sourceCompositeAssetId, selectedAssetId),
          eq(characterVisualAssets.id, selectedAssetId),
        ),
        eq(characterVisualAssets.assetKind, variant),
        isNull(characterVisualAssets.deletedAt),
      ),
    )
    .limit(1);

  if (derivative) return derivative;

  const [selected] = await getProfileDb()
    .select()
    .from(characterVisualAssets)
    .where(
      and(
        eq(characterVisualAssets.id, selectedAssetId),
        eq(characterVisualAssets.householdId, householdId),
        eq(characterVisualAssets.characterId, characterId),
        isNull(characterVisualAssets.deletedAt),
      ),
    )
    .limit(1);

  if (selected?.assetKind === "character_portrait") return selected;
  return null;
}
