"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Profile = {
  id: string;
  householdId: string;
  displayName: string;
  ageBand: string;
  locale: string;
  createdAt: string;
};

export default function ProfilesClientPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/onboarding")
      .then((response) => response.json())
      .then((data) => {
        const onboarding = data.onboarding as {
          hasHousehold: boolean;
          householdId: string | null;
        };

        if (!onboarding.hasHousehold || !onboarding.householdId) {
          setError("Aile evreni henüz oluşturulmamış.");
          setLoading(false);
          return undefined;
        }

        return fetch(
          `/api/child-profiles?householdId=${encodeURIComponent(onboarding.householdId)}`,
        );
      })
      .then((response) => response?.json())
      .then((data) => {
        if (data) {
          setProfiles(data.profiles);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Profiller şu anda yüklenemedi. Biraz sonra tekrar deneyin.");
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingDisplay />;
  if (error) return <ErrorDisplay message={error} />;

  return (
    <section className="storybook-page min-h-full">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-5 py-8 md:px-6 md:py-10">
        <header className="flex flex-col gap-6 rounded-[2rem] border border-outline-variant/70 bg-white/80 p-7 shadow-sm md:p-9 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              className="inline-flex items-center gap-2 text-sm font-bold text-on-surface-variant transition-colors hover:text-primary"
              href="/app"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                arrow_back
              </span>
              Aile hikâye evine dön
            </Link>
            <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
              Çocuklarım
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-on-surface md:text-4xl">
              Her profil başka bir hikâye dünyasının kapısı
            </h1>
            <p className="mt-3 max-w-[44rem] text-base leading-7 text-on-surface-variant md:text-lg">
              Çocukların temel bilgilerini burada görebilir, profillerine geçebilir
              veya yeni bir çocuk için güvenli bir başlangıç oluşturabilirsiniz.
            </p>
          </div>
          <Link className="storybook-button" href="/app/onboarding">
            <span className="material-symbols-outlined" aria-hidden="true">
              person_add
            </span>
            Yeni çocuk profili
          </Link>
        </header>

        {profiles.length === 0 ? (
          <div
            className="rounded-[2rem] border border-dashed border-outline-variant bg-white/75 px-7 py-16 text-center"
            id="empty-state"
          >
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary-fixed text-primary">
              <span className="material-symbols-outlined text-[30px]" aria-hidden="true">
                person_add
              </span>
            </div>
            <h2 className="mt-5 text-2xl font-extrabold text-on-surface">
              Henüz bir çocuk profili yok
            </h2>
            <p className="mx-auto mt-3 max-w-[36rem] text-base leading-7 text-on-surface-variant">
              İlk profil, çocuğun yaşına ve ileride kişiselleştirilecek ilgi alanlarına
              göre kendi hikâye dünyasını kurabilmemiz için başlangıç noktasıdır.
            </p>
            <Link className="storybook-button mt-6" href="/app/onboarding">
              İlk profili oluştur
            </Link>
          </div>
        ) : (
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_310px]">
            <div
              className="grid grid-cols-1 gap-5 md:grid-cols-2"
              id="profile-container"
            >
              {profiles.map((profile, index) => (
                <article
                  key={profile.id}
                  className="group overflow-hidden rounded-[1.8rem] border border-outline-variant/70 bg-white/85 shadow-sm transition-transform hover:-translate-y-1"
                >
                  <div
                    className="relative min-h-[190px] overflow-hidden p-6"
                    style={{
                      background:
                        index % 3 === 0
                          ? "linear-gradient(145deg,#e4f3e8,#f8e7c8)"
                          : index % 3 === 1
                            ? "linear-gradient(145deg,#e9e0f8,#f4efd8)"
                            : "linear-gradient(145deg,#dcecf7,#e9f1d8)",
                    }}
                  >
                    <div className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/55" />
                    <div className="absolute bottom-0 left-0 right-0 h-16 rounded-t-[50%] bg-white/25" />
                    <div className="relative z-10 flex min-h-[142px] flex-col justify-between">
                      <div className="grid h-14 w-14 place-items-center rounded-full border border-white/80 bg-white/75 text-primary shadow-sm">
                        <span className="material-symbols-outlined text-[28px]" aria-hidden="true">
                          face_6
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-on-surface-variant">
                          Yaş grubu {profile.ageBand}
                        </p>
                        <h2 className="mt-2 text-2xl font-extrabold text-on-surface">
                          {profile.displayName}
                        </h2>
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="grid grid-cols-2 gap-3 rounded-[1.2rem] bg-surface-container-low/75 p-4">
                      <div>
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-on-surface-variant">
                          Başlangıç
                        </p>
                        <p className="mt-1 text-sm font-bold text-on-surface">
                          {new Date(profile.createdAt).toLocaleDateString("tr-TR")}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-on-surface-variant">
                          Dil
                        </p>
                        <p className="mt-1 text-sm font-bold text-on-surface">
                          {profile.locale}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                      <Link
                        className="storybook-button flex-1 justify-center"
                        href={`/app/character-onboarding?childProfileId=${encodeURIComponent(profile.id)}`}
                      >
                        Hikâyeye hazırlan
                      </Link>
                      <Link
                        className="storybook-button-secondary flex-1 justify-center"
                        href={`/app/profiles/${encodeURIComponent(profile.id)}`}
                      >
                        Profili aç
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <aside className="rounded-[2rem] border border-outline-variant/70 bg-[#27352b] p-7 text-white shadow-sm xl:sticky xl:top-24 xl:h-fit">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-white/60">
                Aile özeti
              </p>
              <h2 className="mt-2 text-2xl font-extrabold">
                {profiles.length} çocuk profili
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/75">
                Her profil kendi karakterini, anılarını ve dünya sürekliliğini ayrı
                tutacak şekilde ele alınır.
              </p>
              <div className="mt-6 rounded-[1.25rem] bg-white/10 p-4">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-white/55">
                  Son eklenen
                </p>
                <p className="mt-2 text-lg font-bold">
                  {profiles[profiles.length - 1]?.displayName ?? "—"}
                </p>
              </div>
              <Link
                className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full bg-white px-5 text-sm font-extrabold text-[#27352b]"
                href="/app/onboarding"
              >
                Yeni profil ekle
              </Link>
            </aside>
          </section>
        )}
      </div>
    </section>
  );
}

function LoadingDisplay() {
  return (
    <section className="storybook-page min-h-full">
      <div className="mx-auto w-full max-w-[1180px] px-5 py-10 md:px-6">
        <div className="rounded-[2rem] border border-outline-variant/70 bg-white/80 px-7 py-10 text-on-surface-variant shadow-sm">
          Çocukların dünyaları hazırlanıyor…
        </div>
      </div>
    </section>
  );
}

function ErrorDisplay({ message }: { message: string }) {
  return (
    <section className="storybook-page min-h-full">
      <div className="mx-auto w-full max-w-[1180px] px-5 py-10 md:px-6">
        <div className="rounded-[2rem] border border-error-container bg-white/85 px-7 py-10 text-error shadow-sm">
          <p>{message}</p>
          <Link className="mt-5 inline-flex font-bold underline" href="/app/onboarding">
            Kuruluma git
          </Link>
        </div>
      </div>
    </section>
  );
}
