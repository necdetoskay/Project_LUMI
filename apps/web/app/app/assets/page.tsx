import { redirect } from "next/navigation";

import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";
import {
  getCharacterVisualCanon,
  getOwnedHousehold,
  listCharactersByHousehold,
} from "@lumi/profiles/application";
import { VisualLibraryV3 } from "./visual-library-v3";

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
          const canon = await getCharacterVisualCanon(
            parent.id,
            household.id,
            character.id,
          );
          return {
            id: character.id,
            name: character.name,
            subtype: character.subtype,
            originConcept: character.originConcept,
            selectedAssetId: canon?.selectedAssetId ?? null,
          };
        }),
      )
    : [];

  return (
    <VisualLibraryV3
      householdId={household?.id ?? null}
      characters={charactersWithVisuals}
    />
  );
}
