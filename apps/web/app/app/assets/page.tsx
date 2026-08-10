import { redirect } from "next/navigation";

import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";
import {
  getOwnedHousehold,
  listCharactersByHousehold,
} from "@lumi/profiles/application";
import { AssetsClientPage } from "./assets-client-page";

export default async function CharacterVisualLibraryPage() {
  const parent = await getParentFromSessionToken(
    await getParentSessionCookie(),
  );
  if (!parent) redirect("/login");

  const household = await getOwnedHousehold(parent.id);
  const characters = household
    ? await listCharactersByHousehold(parent.id, household.id)
    : [];

  return (
    <AssetsClientPage
      householdId={household?.id ?? null}
      characters={characters.map((character) => ({
        id: character.id,
        name: character.name,
        subtype: character.subtype,
        originConcept: character.originConcept,
      }))}
    />
  );
}
