import { redirect } from "next/navigation";

import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";
import { getOwnedHousehold } from "@lumi/profiles/application";

import { AiGenerationTracesClientPage } from "./traces-client-page";

export default async function AiGenerationTracesPage() {
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

  return <AiGenerationTracesClientPage />;
}
