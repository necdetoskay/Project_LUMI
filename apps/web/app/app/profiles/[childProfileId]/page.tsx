import { redirect } from "next/navigation";

import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";

import ProfileExperienceClientPage from "./profile-experience-client-page";

export default async function ChildProfileDetailPage({
  params,
}: {
  params: Promise<{ childProfileId: string }>;
}) {
  const parent = await getParentFromSessionToken(
    await getParentSessionCookie(),
  );

  if (!parent) {
    redirect("/login");
  }

  const { childProfileId } = await params;

  return <ProfileExperienceClientPage childProfileId={childProfileId} />;
}
