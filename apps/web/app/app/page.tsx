import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";
import { getOnboardingState } from "@lumi/profiles/application";

export default async function ProtectedAppPage() {
  const t = await getTranslations("parentHome");
  const parent = await getParentFromSessionToken(
    await getParentSessionCookie(),
  );

  if (!parent) {
    redirect("/login");
  }

  const state = await getOnboardingState(parent.id);
  const firstProfile = state.childProfiles[0];
  const setupComplete = state.hasHousehold && state.childProfileCount > 0;

  return (
    <section className="storybook-page min-h-full">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-5 py-8 md:px-6 md:py-10">
        <header className="overflow-hidden rounded-[2rem] border border-outline-variant/70 bg-white/80 shadow-sm backdrop-blur">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
            <div className="p-7 md:p-10">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
                {t("kicker")}
              </p>
              <h1 className="mt-3 max-w-[44rem] text-3xl font-extrabold tracking-tight text-on-surface md:text-5xl">
                {t("welcome", { name: parent.displayName })}
              </h1>
              <p className="mt-4 max-w-[42rem] text-base leading-7 text-on-surface-variant md:text-lg">
                {t("intro")}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  className="storybook-button"
                  href={
                    state.hasHousehold
                      ? "/app/onboarding?addProfile=1"
                      : "/app/onboarding"
                  }
                >
                  <span
                    className="material-symbols-outlined"
                    aria-hidden="true"
                  >
                    {state.hasHousehold ? "person_add" : "auto_awesome"}
                  </span>
                  {state.hasHousehold
                    ? t("newChildProfile")
                    : t("createFamilyUniverse")}
                </Link>
                {firstProfile ? (
                  <Link
                    className="storybook-button-secondary"
                    href={`/app/character-onboarding?childProfileId=${encodeURIComponent(firstProfile.id)}`}
                  >
                    {t("prepareFirstStory")}
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="relative min-h-[260px] overflow-hidden bg-[linear-gradient(160deg,#dff4ed_0%,#f6e6c9_55%,#e8dcfb_100%)] p-7 md:p-9">
              <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/55" />
              <div className="absolute bottom-0 left-0 right-0 h-28 rounded-t-[50%] bg-[#8fbf97]/35" />
              <div className="relative z-10 flex h-full min-h-[200px] flex-col justify-between rounded-[1.6rem] border border-white/70 bg-white/55 p-5 backdrop-blur-sm">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-on-surface-variant">
                    {t("todayKicker")}
                  </p>
                  <h2 className="mt-2 text-2xl font-extrabold text-on-surface">
                    {setupComplete ? t("chooseWorld") : t("prepareFamilySpace")}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                    {setupComplete ? t("readyStateText") : t("setupStateText")}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm font-semibold text-on-surface">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-white/80 text-primary">
                    <span
                      className="material-symbols-outlined"
                      aria-hidden="true"
                    >
                      family_restroom
                    </span>
                  </span>
                  {t("profileCount", { count: state.childProfileCount })}
                </div>
              </div>
            </div>
          </div>
        </header>

        <section aria-labelledby="children-heading">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
                {t("childrenKicker")}
              </p>
              <h2
                id="children-heading"
                className="mt-2 text-3xl font-extrabold text-on-surface"
              >
                {t("childrenTitle")}
              </h2>
            </div>
            <Link className="storybook-button-secondary" href="/app/profiles">
              {t("viewAllProfiles")}
            </Link>
          </div>

          {state.childProfiles.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-outline-variant bg-white/75 p-8 text-center md:p-12">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary-fixed text-primary">
                <span
                  className="material-symbols-outlined text-[30px]"
                  aria-hidden="true"
                >
                  face_retouching_natural
                </span>
              </div>
              <h3 className="mt-5 text-2xl font-extrabold text-on-surface">
                {t("emptyTitle")}
              </h3>
              <p className="mx-auto mt-3 max-w-[38rem] text-base leading-7 text-on-surface-variant">
                {t("emptyText")}
              </p>
              <Link
                className="storybook-button mt-6"
                href={
                  state.hasHousehold
                    ? "/app/onboarding?addProfile=1"
                    : "/app/onboarding"
                }
              >
                {t("startProfile")}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {state.childProfiles.map((profile, index) => (
                <article
                  className="group overflow-hidden rounded-[1.8rem] border border-outline-variant/70 bg-white/85 shadow-sm transition-transform hover:-translate-y-1"
                  key={profile.id}
                >
                  <div
                    className="relative min-h-[170px] overflow-hidden p-6"
                    style={{
                      background:
                        index % 3 === 0
                          ? "linear-gradient(145deg,#dff4ed,#f7e8ca)"
                          : index % 3 === 1
                            ? "linear-gradient(145deg,#ece0fb,#f7efd8)"
                            : "linear-gradient(145deg,#dbeaf8,#e9f2d8)",
                    }}
                  >
                    <div className="absolute -right-5 -top-6 h-24 w-24 rounded-full bg-white/50" />
                    <div className="relative z-10 flex h-full flex-col justify-between gap-8">
                      <div className="grid h-14 w-14 place-items-center rounded-full border border-white/80 bg-white/75 text-primary shadow-sm">
                        <span
                          className="material-symbols-outlined text-[28px]"
                          aria-hidden="true"
                        >
                          face_6
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-on-surface-variant">
                          {t("ageBand", { ageBand: profile.ageBand })}
                        </p>
                        <h3 className="mt-2 text-2xl font-extrabold text-on-surface">
                          {profile.displayName}
                        </h3>
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <p className="text-sm leading-6 text-on-surface-variant">
                      {t("profileCardText")}
                    </p>
                    <div className="mt-5 flex gap-2">
                      <Link
                        className="storybook-button flex-1 justify-center"
                        href={`/app/character-onboarding?childProfileId=${encodeURIComponent(profile.id)}`}
                      >
                        {t("continue")}
                      </Link>
                      <Link
                        className="storybook-button-secondary"
                        href={`/app/profiles/${encodeURIComponent(profile.id)}`}
                        aria-label={t("openProfile", {
                          name: profile.displayName,
                        })}
                      >
                        <span
                          className="material-symbols-outlined"
                          aria-hidden="true"
                        >
                          tune
                        </span>
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section
          className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,.75fr)]"
          aria-labelledby="world-news-heading"
        >
          <article className="rounded-[2rem] border border-outline-variant/70 bg-white/80 p-7 shadow-sm md:p-8">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant">
                <span className="material-symbols-outlined" aria-hidden="true">
                  flare
                </span>
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
                  {t("worldNewsKicker")}
                </p>
                <h2
                  id="world-news-heading"
                  className="mt-2 text-2xl font-extrabold text-on-surface"
                >
                  {t("worldNewsTitle")}
                </h2>
                <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                  {state.childProfileCount > 0
                    ? t("worldNewsReady")
                    : t("worldNewsSetup")}
                </p>
              </div>
            </div>
          </article>

          <aside className="rounded-[2rem] border border-outline-variant/70 bg-[#243127] p-7 text-white shadow-sm md:p-8">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-white/65">
              {t("nextStepKicker")}
            </p>
            <h2 className="mt-2 text-2xl font-extrabold">
              {setupComplete ? t("chooseChild") : t("completeFamilySpace")}
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/75">
              {setupComplete ? t("nextStepReady") : t("nextStepSetup")}
            </p>
            <Link
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-extrabold text-[#243127] transition-transform hover:-translate-y-0.5"
              href={
                setupComplete && firstProfile
                  ? `/app/character-onboarding?childProfileId=${encodeURIComponent(firstProfile.id)}`
                  : "/app/onboarding"
              }
            >
              {setupComplete ? t("continueWithProfile") : t("continueSetup")}
            </Link>
          </aside>
        </section>
      </div>
    </section>
  );
}
