import Link from "next/link";
import { redirect } from "next/navigation";

import DashboardV2Client from "./dashboard-v2-client";
import styles from "./dashboard-v2.module.css";

import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";
import { getOnboardingState } from "@lumi/profiles/application";

export default async function ProtectedAppPage() {
  const parent = await getParentFromSessionToken(
    await getParentSessionCookie(),
  );

  if (!parent) {
    redirect("/login");
  }

  const state = await getOnboardingState(parent.id);
  const firstProfile = state.childProfiles[0] ?? null;

  if (!state.householdId || !firstProfile) {
    return (
      <section className={`lumi-dashboard-v2 ${styles.page}`}>
        <style>{`
          body:has(.lumi-dashboard-v2) { background: #020817; }
          body:has(.lumi-dashboard-v2) > header,
          body:has(.lumi-dashboard-v2) > footer { display: none; }
          body:has(.lumi-dashboard-v2) > main { min-height: 100vh; }
        `}</style>
        <aside className={styles.sidebar}>
          <Link className={styles.logo} href="/app">
            LUMI<span>✦</span>
          </Link>
        </aside>
        <main className={styles.main}>
          <section className={styles.heroRow}>
            <div className={styles.welcome}>
              <h1>
                Hikâye evin
                <br />
                seni bekliyor <span>✦</span>
              </h1>
              <p>
                Dashboard gerçek çocuk, karakter ve dünya verileriyle canlanır. Önce
                aile alanını ve ilk çocuk profilini hazırlayalım.
              </p>
              <Link
                className={styles.primaryButton}
                href={state.hasHousehold ? "/app/onboarding?addProfile=1" : "/app/onboarding"}
              >
                {state.hasHousehold ? "Çocuk Profili Oluştur" : "Aile Alanını Hazırla"}
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
            </div>
          </section>
        </main>
      </section>
    );
  }

  return (
    <DashboardV2Client
      parentName={parent.displayName}
      householdId={state.householdId}
      childProfileId={firstProfile.id}
      childName={firstProfile.displayName}
      ageBand={firstProfile.ageBand}
    />
  );
}
