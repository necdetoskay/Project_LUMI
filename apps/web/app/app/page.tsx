import Link from "next/link";
import { redirect } from "next/navigation";

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
  const firstProfile = state.childProfiles[0];
  const setupComplete = state.hasHousehold && state.childProfileCount > 0;

  return (
    <section className="storybook-page min-h-full">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-5 py-8 md:px-6 md:py-10">
        <header className="overflow-hidden rounded-[2rem] border border-outline-variant/70 bg-white/80 shadow-sm backdrop-blur">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
            <div className="p-7 md:p-10">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
                Ailenizin hikâye evi
              </p>
              <h1 className="mt-3 max-w-[44rem] text-3xl font-extrabold tracking-tight text-on-surface md:text-5xl">
                Hoş geldin {parent.displayName}.
              </h1>
              <p className="mt-4 max-w-[42rem] text-base leading-7 text-on-surface-variant md:text-lg">
                Burada her çocuk kendi dünyasına, anılarına ve devam eden
                hikâyelerine sahip olur. Bir profili seçerek kaldığınız yerden
                devam edebilir veya yeni bir dünya için ilk adımı atabilirsiniz.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  className="storybook-button"
                  href={state.hasHousehold ? "/app/onboarding" : "/app/onboarding"}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {state.hasHousehold ? "person_add" : "auto_awesome"}
                  </span>
                  {state.hasHousehold ? "Yeni çocuk profili" : "Aile evrenini oluştur"}
                </Link>
                {firstProfile ? (
                  <Link
                    className="storybook-button-secondary"
                    href={`/app/character-onboarding?childProfileId=${encodeURIComponent(firstProfile.id)}`}
                  >
                    İlk hikâyeye hazırlan
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
                    Bugünkü sakin başlangıç
                  </p>
                  <h2 className="mt-2 text-2xl font-extrabold text-on-surface">
                    {setupComplete
                      ? "Bir çocuğun dünyasını seçin"
                      : "Önce aile alanınızı hazırlayın"}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                    {setupComplete
                      ? "LUMI yalnızca gerçekten kayıtlı olan çocuk ve dünya durumlarını gösterir; burada olmayan bir olayı olmuş gibi anlatmaz."
                      : "Evren ve çocuk profili hazır olduğunda bu alan yaşayan hikâyelerin başlangıç noktası olacak."}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm font-semibold text-on-surface">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-white/80 text-primary">
                    <span className="material-symbols-outlined" aria-hidden="true">
                      family_restroom
                    </span>
                  </span>
                  {state.childProfileCount > 0
                    ? `${state.childProfileCount} çocuk profili hazır`
                    : "Henüz çocuk profili yok"}
                </div>
              </div>
            </div>
          </div>
        </header>

        <section aria-labelledby="children-heading">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
                Çocuklarım
              </p>
              <h2 id="children-heading" className="mt-2 text-3xl font-extrabold text-on-surface">
                Her çocuk için ayrı bir dünya
              </h2>
            </div>
            <Link className="storybook-button-secondary" href="/app/profiles">
              Tüm profilleri gör
            </Link>
          </div>

          {state.childProfiles.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-outline-variant bg-white/75 p-8 text-center md:p-12">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary-fixed text-primary">
                <span className="material-symbols-outlined text-[30px]" aria-hidden="true">
                  face_retouching_natural
                </span>
              </div>
              <h3 className="mt-5 text-2xl font-extrabold text-on-surface">
                İlk çocuk profilini oluşturalım
              </h3>
              <p className="mx-auto mt-3 max-w-[38rem] text-base leading-7 text-on-surface-variant">
                Profil; yaş grubu, ilgi alanları ve ileride hikâyeleri kişiselleştirecek
                gelişim tercihleri için güvenli başlangıç noktasıdır.
              </p>
              <Link className="storybook-button mt-6" href="/app/onboarding">
                Profili oluşturmaya başla
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
                        <span className="material-symbols-outlined text-[28px]" aria-hidden="true">
                          face_6
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-on-surface-variant">
                          Yaş grubu {profile.ageBand}
                        </p>
                        <h3 className="mt-2 text-2xl font-extrabold text-on-surface">
                          {profile.displayName}
                        </h3>
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <p className="text-sm leading-6 text-on-surface-variant">
                      Bu profil için karakteri hazırlayabilir, ardından yaşayan
                      hikâye evrenine geçebilirsiniz.
                    </p>
                    <div className="mt-5 flex gap-2">
                      <Link
                        className="storybook-button flex-1 justify-center"
                        href={`/app/character-onboarding?childProfileId=${encodeURIComponent(profile.id)}`}
                      >
                        Devam et
                      </Link>
                      <Link
                        className="storybook-button-secondary"
                        href={`/app/profiles/${encodeURIComponent(profile.id)}`}
                        aria-label={`${profile.displayName} profilini aç`}
                      >
                        <span className="material-symbols-outlined" aria-hidden="true">
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
                  Dünyalardan Haberler
                </p>
                <h2 id="world-news-heading" className="mt-2 text-2xl font-extrabold text-on-surface">
                  Gerçek durumdan gelen küçük notlar
                </h2>
                <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                  {state.childProfileCount > 0
                    ? "Henüz doğrulanmış bir dünya olayı akışı yok. LUMI bu yüzden burada uydurma haber göstermiyor; gerçek world-state feed hazır olduğunda yalnızca kanonik gelişmeler bu alana gelecek."
                    : "İlk çocuk profili ve evren oluşturulduğunda, doğrulanmış dünya gelişmeleri ileride bu alanda sakin bir özet olarak görünecek."}
                </p>
              </div>
            </div>
          </article>

          <aside className="rounded-[2rem] border border-outline-variant/70 bg-[#243127] p-7 text-white shadow-sm md:p-8">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-white/65">
              Bir sonraki doğal adım
            </p>
            <h2 className="mt-2 text-2xl font-extrabold">
              {setupComplete ? "Bir çocuk seçin" : "Aile alanını tamamlayın"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/75">
              {setupComplete
                ? "Her çocuğun karakteri, ilgileri ve hikâye geçmişi ayrı tutulur. Bir profil seçerek kendi dünyasına geçin."
                : "Evren ve profil oluşturma tamamlandığında karakter ve hikâye hazırlığına geçebilirsiniz."}
            </p>
            <Link
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-extrabold text-[#243127] transition-transform hover:-translate-y-0.5"
              href={
                setupComplete && firstProfile
                  ? `/app/character-onboarding?childProfileId=${encodeURIComponent(firstProfile.id)}`
                  : "/app/onboarding"
              }
            >
              {setupComplete ? "Profille devam et" : "Kuruluma devam et"}
            </Link>
          </aside>
        </section>
      </div>
    </section>
  );
}
