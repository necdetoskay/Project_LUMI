import { getTranslations } from "next-intl/server";

import { getCharacterVisualCanon } from "@lumi/profiles/application";
import { getCharacterCurrentLocation } from "@lumi/world/application";
import { CharacterIdentityHeader } from "./character-identity-header";

function typeKey(subtype: string) {
  const value = subtype.trim().toLowerCase();
  if (value === "child" || value === "child_avatar") return "child";
  if (value === "human") return "human";
  if (value === "animal") return "animal";
  if (value === "fantastic" || value === "fantasy") return "fantasy";
  return "generic";
}

function isTechnical(value: string) {
  return (
    value.includes("_") || (/^[a-z0-9-]+$/.test(value) && value.includes("-"))
  );
}

export async function CharacterIdentityHeaderServer({
  parentId,
  householdId,
  character,
  storyCount,
}: {
  parentId: string;
  householdId: string;
  character: {
    id: string;
    name: string;
    subtype: string;
    startingLocation: string;
  };
  storyCount: number;
}) {
  const [canon, currentLocation, t] = await Promise.all([
    getCharacterVisualCanon(parentId, householdId, character.id),
    getCharacterCurrentLocation(character.id),
    getTranslations("assets"),
  ]);

  const startingLocation = character.startingLocation.trim();
  const hasCanonicalLocation = Boolean(currentLocation?.displayName?.trim());
  const hasSafeStartingLocation = Boolean(
    startingLocation && !isTechnical(startingLocation),
  );
  const locationLabel =
    currentLocation?.displayName?.trim() ||
    (hasSafeStartingLocation ? startingLocation : null) ||
    t("detail.locationPending");
  const selectedImageUrl = canon?.selectedAssetId
    ? `/api/assets/characters/${encodeURIComponent(character.id)}/content/${encodeURIComponent(canon.selectedAssetId)}?householdId=${encodeURIComponent(householdId)}`
    : null;

  console.info("[LUMI_ASSETS_SERVER]", {
    marker: "assets-runtime-diag-2026-08-13-v1",
    route: "/app/assets/characters/[characterId]::identity-header",
    characterTypeKey: typeKey(character.subtype),
    hasSelectedAsset: Boolean(canon?.selectedAssetId),
    hasCanonicalLocation,
    hasSafeStartingLocation,
    storyCount,
  });

  return (
    <CharacterIdentityHeader
      appearanceLabel={t("detail.appearance")}
      characterName={character.name}
      characterTypeLabel={t(`characterTypes.${typeKey(character.subtype)}`)}
      hubTitle={t("detail.hubTitle")}
      imageAlt={t("detail.selectedImageAlt", { name: character.name })}
      locationLabel={locationLabel}
      locationTitle={t("detail.location")}
      selectedImageUrl={selectedImageUrl}
      storyCount={storyCount}
      storyLabel={t("detail.story")}
      visualIdentityLabel={t("detail.visualIdentity")}
    />
  );
}
