import { redirect } from "next/navigation";

import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";
import CanonicalCharacterWizardClient from "./canonical-character-wizard-client";

export default async function CanonicalCharacterWizardPage({
  params,
}: {
  params: Promise<{ childProfileId: string }>;
}) {
  const parent = await getParentFromSessionToken(await getParentSessionCookie());
  if (!parent) redirect("/login");
  const { childProfileId } = await params;
  return <CanonicalCharacterWizardClient childProfileId={childProfileId} />;
}
