import { redirect } from "next/navigation";

import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";

export default async function CharacterOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ childProfileId?: string }>;
}) {
  const parent = await getParentFromSessionToken(
    await getParentSessionCookie(),
  );

  if (!parent) {
    redirect("/login");
  }

  const { childProfileId } = await searchParams;
  if (!childProfileId) {
    redirect("/app/profiles");
  }

  redirect(
    `/app/profiles/${encodeURIComponent(childProfileId)}/characters/new/type`,
  );
}
