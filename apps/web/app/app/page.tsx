import { redirect } from "next/navigation";
import Link from "next/link";

import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";
import { getOnboardingState } from "@lumi/profiles/application";

export default async function ProtectedAppPage() {
  const parent = await getParentFromSessionToken(await getParentSessionCookie());

  if (!parent) {
    redirect("/login");
  }

  const state = await getOnboardingState(parent.id);
  const setupComplete = state.hasHousehold && state.childProfileCount > 0;
  const primarySetupLabel = state.hasHousehold ? "Çocuk profili ekle" : "Aile evreni oluştur";
  const firstProfile = state.childProfiles[0];

  return (
    <section className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-6 rounded-2xl border border-outline-variant bg-white px-8 py-8 md:px-10 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.08em] text-primary">
            Ebeveyn alanı
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-on-surface md:text-4xl">
            Hoş geldin {parent.displayName}
          </h1>
          <p className="mt-3 max-w-[44rem] text-base leading-7 text-on-surface-variant md:text-lg">
            Aile evrenini kur, çocuk profillerini yönet ve ilk karakter başlatma akışına buradan devam et.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          <Link
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary transition-colors hover:bg-[#4c29cf]"
            href="/app/onboarding"
          >
            <span className="material-symbols-outlined text-[20px]">
              {state.hasHousehold ? "person_add" : "rocket_launch"}
            </span>
            {primarySetupLabel}
          </Link>
          <Link
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container"
            href="/app/profiles"
          >
            <span className="material-symbols-outlined text-[20px]">group</span>
            Profilleri yönet
          </Link>
          <Link
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container"
            href="/app/settings"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
            Ayarlar
          </Link>
          <form action="/api/auth/logout" method="post">
            <button
              className="inline-flex h-11 items-center rounded-lg border border-outline-variant bg-white px-5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low"
              type="submit"
            >
              Çıkış yap
            </button>
          </form>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <StatusCard
          icon="public"
          label="Aile evreni"
          title={state.hasHousehold ? state.householdName ?? "Kuruldu" : "Henüz kurulmadı"}
          body={
            state.hasHousehold
              ? "Aile alanın hazır. Yeni çocuk profili ekleyebilir veya mevcut profilleri yönetebilirsin."
              : "İlk adım olarak aile evrenini oluşturman gerekiyor. Bu alan tüm çocuk profillerinin güvenli kapsamı olacak."
          }
          href="/app/onboarding"
          cta={state.hasHousehold ? "Evren kurulumuna git" : "Evren oluştur"}
        />
        <StatusCard
          icon="supervised_user_circle"
          label="Çocuk profilleri"
          title={`${state.childProfileCount} profil`}
          body={
            state.childProfileCount > 0
              ? "Profiller hazır. Her profil için yaş grubu ve karakter başlatma adımını yönetebilirsin."
              : "Henüz çocuk profili yok. Karakter ve hikaye akışından önce en az bir profil eklenmeli."
          }
          href={state.hasHousehold ? "/app/onboarding" : "/app/onboarding"}
          cta={state.childProfileCount > 0 ? "Yeni profil ekle" : "İlk profili ekle"}
        />
        <StatusCard
          icon="auto_awesome"
          label="Karakter başlatma"
          title={setupComplete ? "Hazır" : "Profil bekliyor"}
          body={
            setupComplete
              ? "Seçili çocuk profili için manual veya auto origin package ile ilk karakteri başlatabilirsin."
              : "Karakter başlatmak için önce aile evreni ve en az bir çocuk profili gerekiyor."
          }
          href={firstProfile ? `/app/character-onboarding?childProfileId=${encodeURIComponent(firstProfile.id)}` : "/app/onboarding"}
          cta={setupComplete ? "Karakter başlat" : "Kuruluma devam et"}
        />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-2xl border border-outline-variant bg-white p-6 md:p-8">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-primary">
                Profil listesi
              </p>
              <h2 className="mt-2 text-2xl font-bold text-on-surface">Çocuklar</h2>
            </div>
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-4 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container"
              href="/app/profiles"
            >
              Tüm profiller
            </Link>
          </div>

          {state.childProfiles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-5 py-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-fixed text-primary">
                <span className="material-symbols-outlined text-[28px]">person_add</span>
              </div>
              <h3 className="text-lg font-bold text-on-surface">Çocuk profili yok</h3>
              <p className="mx-auto mt-2 max-w-[34rem] text-sm leading-6 text-on-surface-variant">
                Bu ekrandan kuruluma giderek ilk çocuk profilini ekleyebilirsin.
              </p>
              <Link
                className="mt-5 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-[#4c29cf]"
                href="/app/onboarding"
              >
                Profil ekle
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {state.childProfiles.map((profile) => (
                <article
                  className="rounded-xl border border-outline-variant bg-surface-container-low p-5"
                  key={profile.id}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-fixed text-primary">
                      <span className="material-symbols-outlined text-[24px]">face</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-bold text-on-surface">{profile.displayName}</h3>
                      <p className="mt-1 text-sm text-on-surface-variant">Yaş grubu: {profile.ageBand}</p>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                    <Link
                      className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-[#4c29cf]"
                      href={`/app/character-onboarding?childProfileId=${encodeURIComponent(profile.id)}`}
                    >
                      Karakter başlat
                    </Link>
                    <Link
                      className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-outline-variant bg-white px-4 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container"
                      href="/app/profiles"
                    >
                      Yönet
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="rounded-2xl border border-outline-variant bg-white p-6 md:p-8 xl:h-fit">
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-primary">
            Sıradaki adım
          </p>
          <h2 className="mt-2 text-2xl font-bold text-on-surface">
            {setupComplete ? "Karakter akışını tamamla" : "Kurulumu tamamla"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">
            {setupComplete
              ? "Sprint 04 kapsamında karakter başlatma hazır. Story/world kayıtları sonraki sprintlere kaldı."
              : "Evren ve çocuk profili olmadan karakter veya hikaye akışı başlatılamaz."}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary transition-colors hover:bg-[#4c29cf]"
              href={setupComplete && firstProfile ? `/app/character-onboarding?childProfileId=${encodeURIComponent(firstProfile.id)}` : "/app/onboarding"}
            >
              {setupComplete ? "Karakter başlat" : "Kuruluma git"}
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-low px-5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container"
              href="/app/profiles"
            >
              Profil panelini aç
            </Link>
          </div>
        </aside>
      </section>
    </section>
  );
}

function StatusCard({
  icon,
  label,
  title,
  body,
  href,
  cta,
}: {
  icon: string;
  label: string;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <article className="flex min-h-[260px] flex-col justify-between rounded-2xl border border-outline-variant bg-white p-6">
      <div>
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-fixed text-primary">
          <span className="material-symbols-outlined text-[24px]">{icon}</span>
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
          {label}
        </p>
        <h2 className="mt-2 text-2xl font-bold text-on-surface">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-on-surface-variant">{body}</p>
      </div>
      <Link
        className="mt-6 inline-flex h-10 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-low px-4 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container"
        href={href}
      >
        {cta}
      </Link>
    </article>
  );
}
