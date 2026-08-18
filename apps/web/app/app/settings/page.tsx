import Link from "next/link";
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

  return (
    <>
      <div style={{ maxWidth: 1120, margin: "24px auto 0", padding: "0 20px" }}>
        <Link href="/app/settings/test-lab">LUMI Test Lab →</Link>
      </div>
      <LlmSettingsClientPage />
    </>
  );
}
