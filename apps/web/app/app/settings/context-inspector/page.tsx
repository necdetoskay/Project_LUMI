import { redirect } from "next/navigation";

import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";
import { getOwnedHousehold } from "@lumi/profiles/application";

import { ContextInspectorClientPage } from "./context-inspector-client-page";

export default async function ContextInspectorPage() {
  const parent = await getParentFromSessionToken(
    await getParentSessionCookie(),
  );

  if (!parent) {
    redirect("/login");
  }

  const household = await getOwnedHousehold(parent.id);
  if (!household) {
    redirect("/onboarding");
  }

  return <ContextInspectorClientPage householdId={household.id} />;
}
