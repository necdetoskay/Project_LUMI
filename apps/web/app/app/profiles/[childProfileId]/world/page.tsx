import { redirect } from "next/navigation";

import { ProfileWorldMapSection } from "@/components/world/profile-world-map-section";
import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";

export default async function ChildProfileWorldPage({
  params,
  searchParams,
}: {
  params: Promise<{ childProfileId: string }>;
  searchParams: Promise<{ characterId?: string }>;
}) {
  const parent = await getParentFromSessionToken(
    await getParentSessionCookie(),
  );

  if (!parent) {
    redirect("/login");
  }

  const { childProfileId } = await params;
  const { characterId } = await searchParams;

  return (
    <ProfileWorldMapSection
      childProfileId={childProfileId}
      characterId={characterId ?? null}
    />
  );
}
