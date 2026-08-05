import { redirect } from "next/navigation";

import { ProfileCharacterDetailSection } from "@/components/character/profile-character-detail-section";
import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";

export default async function CharacterDetailPage({
  params,
}: {
  params: Promise<{ childProfileId: string; characterId: string }>;
}) {
  const parent = await getParentFromSessionToken(
    await getParentSessionCookie(),
  );

  if (!parent) {
    redirect("/login");
  }

  const { childProfileId, characterId } = await params;

  return (
    <ProfileCharacterDetailSection
      childProfileId={childProfileId}
      characterId={characterId}
    />
  );
}
