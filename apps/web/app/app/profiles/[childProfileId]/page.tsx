import { redirect } from "next/navigation";

import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";

import ChildDashboardClientPage from "./child-dashboard-client-page";
import ProfileExperienceClientPage from "./profile-experience-client-page";

export default async function ChildProfileDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ childProfileId: string }>;
  searchParams: Promise<{ manage?: string }>;
}) {
  const parent = await getParentFromSessionToken(
    await getParentSessionCookie(),
  );

  if (!parent) {
    redirect("/login");
  }

  const { childProfileId } = await params;
  const { manage } = await searchParams;

  if (manage === "1") {
    return <ProfileExperienceClientPage childProfileId={childProfileId} />;
  }

  return <ChildDashboardClientPage childProfileId={childProfileId} />;
}
