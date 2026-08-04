import { redirect } from "next/navigation";
import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";

import LlmSettingsClientPage from "./llm-settings-client-page";

export default async function SettingsPage() {
  const parent = await getParentFromSessionToken(
    await getParentSessionCookie(),
  );

  if (!parent) {
    redirect("/login");
  }

  return <LlmSettingsClientPage />;
}
