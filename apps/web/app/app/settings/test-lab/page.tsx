import { redirect } from "next/navigation";

import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";
import { getOnboardingState } from "@lumi/profiles/application";

import OnboardingTestRunner from "./onboarding-test-runner";

export default async function TestLabPage() {
  const parent = await getParentFromSessionToken(
    await getParentSessionCookie(),
  );
  if (!parent) redirect("/login");

  const state = await getOnboardingState(parent.id);
  const households = state.householdId
    ? [{ id: state.householdId, label: "Mevcut aile alanı" }]
    : [];
  const childProfiles = state.householdId
    ? state.childProfiles.map((profile) => ({
        id: profile.id,
        householdId: state.householdId as string,
        displayName: profile.displayName,
        ageBand: profile.ageBand,
      }))
    : [];

  return (
    <OnboardingTestRunner
      households={households}
      childProfiles={childProfiles}
    />
  );
}
