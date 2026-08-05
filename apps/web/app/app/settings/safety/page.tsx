import { redirect } from "next/navigation";
import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";

import SafetySettingsClientPage from "./safety-settings-client-page";

export default async function SafetySettingsPage() {
  const parent = await getParentFromSessionToken(
    await getParentSessionCookie(),
  );

  if (!parent) {
    redirect("/login");
  }

  return <SafetySettingsClientPage />;
}
