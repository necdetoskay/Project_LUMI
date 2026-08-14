import { redirect } from "next/navigation";
import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";
import PromptManagementClientPage from "./prompt-management-client-page";

export default async function PromptManagementPage() {
  const parent = await getParentFromSessionToken(
    await getParentSessionCookie(),
  );

  if (!parent) redirect("/login");

  return <PromptManagementClientPage />;
}
