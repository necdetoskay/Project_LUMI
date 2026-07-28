import { redirect } from "next/navigation";

import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";

import CharacterOnboardingClientPage from "./character-onboarding-client-page";

export default async function CharacterOnboardingPage() {
  const parent = await getParentFromSessionToken(await getParentSessionCookie());

  if (!parent) {
    redirect("/login");
  }

  return <CharacterOnboardingClientPage />;
}
