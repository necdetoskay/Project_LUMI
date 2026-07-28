import { redirect } from "next/navigation";

import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";

import ProfilesClientPage from "./profiles-client-page";

export default async function ProfilesPage() {
  const parent = await getParentFromSessionToken(await getParentSessionCookie());

  if (!parent) {
    redirect("/login");
  }

  return <ProfilesClientPage />;
}
