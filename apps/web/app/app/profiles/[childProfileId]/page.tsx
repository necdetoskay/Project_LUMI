import { redirect } from "next/navigation";

import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";

import ProfileDetailClientPage from "./profile-detail-client-page";

export default async function ChildProfileDetailPage({
  params,
}: {
  params: Promise<{ childProfileId: string }>;
}) {
  const parent = await getParentFromSessionToken(await getParentSessionCookie());

  if (!parent) {
    redirect("/login");
  }

  const { childProfileId } = await params;

  return <ProfileDetailClientPage childProfileId={childProfileId} />;
}
