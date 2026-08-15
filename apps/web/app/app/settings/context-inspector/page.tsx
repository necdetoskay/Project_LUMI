import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getOwnedHousehold } from "@lumi/profiles/application";

import { ContextInspectorClientPage } from "./context-inspector-client-page";

export default async function ContextInspectorPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const household = await getOwnedHousehold(session.user.id);
  if (!household) {
    redirect("/onboarding");
  }

  return <ContextInspectorClientPage householdId={household.id} />;
}
