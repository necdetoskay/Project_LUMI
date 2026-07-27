import { redirect } from "next/navigation";

import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";
import { getOnboardingState } from "@lumi/profiles/application";

export default async function ProtectedAppPage() {
  const parent = await getParentFromSessionToken(await getParentSessionCookie());

  if (!parent) {
    redirect("/login");
  }

  const state = await getOnboardingState(parent.id);

  if (!state.hasHousehold || state.childProfileCount === 0) {
    redirect("/app/onboarding");
  }

  return (
    <section className="container page-section">
      <p className="eyebrow">PROJECT LUMI</p>
      <h1>Ebeveyn alanı</h1>
      <p className="lead">
        Hoş geldin {parent.displayName}.
      </p>
      <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
        <a className="button-link" href="/app/profiles">
          Profiller
        </a>
        <form action="/api/auth/logout" method="post">
          <button type="submit">Çıkış yap</button>
        </form>
      </div>
    </section>
  );
}
