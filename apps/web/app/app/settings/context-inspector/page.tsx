import Link from "next/link";
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

  return (
    <>
      <div className="mx-auto flex w-full max-w-7xl justify-end px-4 pt-4 sm:px-6 lg:px-8">
        <Link
          href="/app/settings/context-inspector/traces"
          className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100"
        >
          AI Generation Traces →
        </Link>
      </div>
      <ContextInspectorClientPage householdId={household.id} />
    </>
  );
}
