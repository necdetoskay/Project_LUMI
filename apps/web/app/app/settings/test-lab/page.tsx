import { redirect } from "next/navigation";

import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";

import { PromptWorkspaceStandalone } from "./prompt-workspace-standalone";
import TestLabClient from "./test-lab-client";

export default async function TestLabPage() {
  const parent = await getParentFromSessionToken(
    await getParentSessionCookie(),
  );
  if (!parent) redirect("/login");
  return (
    <>
      <TestLabClient />
      <PromptWorkspaceStandalone />
    </>
  );
}
