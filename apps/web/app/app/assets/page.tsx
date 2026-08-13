import { redirect } from "next/navigation";

import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";
import {
  getCharacterVisualCanon,
  getOwnedHousehold,
  listCharactersByHousehold,
} from "@lumi/profiles/application";
import { getCharacterCurrentLocation } from "@lumi/world/application";
import { AssetsRuntimeDiagnostics } from "./runtime-diagnostics";
import { VisualLibrary } from "./visual-library";

export default async function CharacterVisualLibraryPage() {
  const parent = await getParentFromSessionToken(
    await getParentSessionCookie(),
  );
  if (!parent) redirect("/login");

  const household = await getOwnedHousehold(parent.id);
  const characters = household
    ? await listCharactersByHousehold(parent.id, household.id)
    : [];
  const charactersWithVisuals = household
    ? await Promise.all(
        characters.map(async (character) => {
          const [canon, currentLocation] = await Promise.all([
            getCharacterVisualCanon(parent.id, household.id, character.id),
            getCharacterCurrentLocation(character.id),
          ]);
          return {
            id: character.id,
            name: character.name,
            subtype: character.subtype,
            startingLocation: character.startingLocation,
            currentLocationName: currentLocation?.displayName ?? null,
            selectedAssetId: canon?.selectedAssetId ?? null,
          };
        }),
      )
    : [];

  const diagnosticPayload = {
    householdResolved: Boolean(household),
    characterCount: charactersWithVisuals.length,
    charactersWithSelectedAsset: charactersWithVisuals.filter((character) =>
      Boolean(character.selectedAssetId),
    ).length,
    charactersWithCanonicalLocation: charactersWithVisuals.filter((character) =>
      Boolean(character.currentLocationName),
    ).length,
  };

  console.warn("[LUMI_ASSETS_SERVER]", {
    marker: "assets-runtime-diag-2026-08-13-v1",
    route: "/app/assets",
    ...diagnosticPayload,
  });

  return (
    <>
      <AssetsRuntimeDiagnostics
        payload={diagnosticPayload}
        route="/app/assets"
      />
      <VisualLibrary
        householdId={household?.id ?? null}
        characters={charactersWithVisuals}
      />
    </>
  );
}
