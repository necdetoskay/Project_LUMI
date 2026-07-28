"use client";

import { useCallback, useEffect, useState } from "react";

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
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/onboarding")
      .then((r) => r.json())
      .then((data) => {
        const s = data.onboarding as { hasHousehold: boolean; householdId: string | null };
        if (!s.hasHousehold || !s.householdId) {
          setError("No household found. Complete onboarding first.");
          setLoading(false);
          return;
        }

        setHouseholdId(s.householdId);
        return fetch(`/api/child-profiles?householdId=${s.householdId}`);
      })
      .then((r) => r?.json())
      .then((data) => {
        if (data) {
          setProfiles(data.profiles);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load profiles");
        setLoading(false);
      });
  }, []);

  const archiveProfile = useCallback(async (profileId: string) => {
    if (!householdId) {
      setError("Household not available");
      return;
    }

    setArchivingId(profileId);
    try {
      const res = await fetch(`/api/child-profiles/${profileId}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message ?? "Failed to archive profile");
        return;
      }

      setProfiles((current) => current.filter((profile) => profile.id !== profileId));
    } catch {
      setError("Failed to archive profile");
    } finally {
      setArchivingId(null);
    }
  }, [householdId]);

  if (loading) return <LoadingDisplay />;
  if (error) return <ErrorDisplay message={error} />;

  return (
    <main className="mx-auto flex w-full max-w-[1180px] flex-col px-6 py-10">
      <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <nav className="mb-3 flex items-center gap-2 text-sm font-semibold text-on-surface-variant">
            <a className="transition-colors hover:text-primary" href="/app">
              Dashboard
            </a>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="text-primary">Profiller</span>
          </nav>
          <h1 className="text-3xl font-extrabold tracking-tight text-on-surface md:text-4xl">
            Cocuk Profilleri
          </h1>
          <p className="mt-3 max-w-[42rem] text-base leading-7 text-on-surface-variant md:text-lg">
            Aileniz icin olusturulan profilleri tek yerden gorun, duzenleyin ve arsivleyin.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-[#4c29cf]"
            href="/app/onboarding"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Yeni Profil
          </a>
        </div>
      </header>

      {profiles.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-outline-variant bg-white px-8 py-20 text-center"
          id="empty-state"
        >
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-fixed text-primary">
            <span className="material-symbols-outlined text-[36px]">person_add</span>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-on-surface">Henuz profil eklenmemis</h2>
          <p className="mb-8 max-w-[34rem] text-base leading-7 text-on-surface-variant">
            Ilk profili olusturdugunuzda yas grubu ve temel bilgilerle aile alaninizi kullanmaya
            baslayabilirsiniz.
          </p>
          <a
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary transition-colors hover:bg-[#4c29cf]"
            href="/app/onboarding"
          >
            <span className="material-symbols-outlined text-[20px]">rocket_launch</span>
            Kuruluma git
          </a>
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2" id="profile-container">
            {profiles.map((p) => (
              <article
                key={p.id}
                className="profile-card-hover overflow-hidden rounded-2xl border border-outline-variant bg-white p-6"
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-fixed text-primary">
                      <span className="material-symbols-outlined text-[28px]">face</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-on-surface">{p.displayName}</h3>
                      <p className="mt-1 text-sm text-on-surface-variant">Yas grubu: {p.ageBand}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success">
                    Aktif
                  </span>
                </div>

                <div className="mb-6 grid grid-cols-2 gap-3 rounded-xl bg-surface-container-low px-4 py-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
                      Olusturma
                    </p>
                    <p className="mt-1 text-sm font-semibold text-on-surface">
                      {new Date(p.createdAt).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
                      Dil
                    </p>
                    <p className="mt-1 text-sm font-semibold text-on-surface">{p.locale}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <a
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-[#4c29cf]"
                    href={`/app/character-onboarding?childProfileId=${encodeURIComponent(p.id)}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                    Karakter Baslat
                  </a>
                  <div className="flex gap-3">
                    <button
                      className="flex-1 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container"
                      type="button"
                    >
                      Duzenle
                    </button>
                    <button
                      className="inline-flex items-center gap-2 rounded-lg border border-error-container bg-white px-4 py-3 text-sm font-semibold text-error transition-colors hover:bg-destructive-soft"
                      type="button"
                      onClick={() => archiveProfile(p.id)}
                      disabled={archivingId === p.id}
                    >
                      <span className="material-symbols-outlined text-[18px]">archive</span>
                      {archivingId === p.id ? "Arsivleniyor" : "Arsivle"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <aside className="rounded-2xl border border-outline-variant bg-white p-6 xl:sticky xl:top-24 xl:h-fit">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
              Ozet
            </p>
            <h2 className="mt-2 text-2xl font-bold text-on-surface">{profiles.length} profil</h2>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">
              Bu alandan profilleri izleyebilir, duzenleyebilir ve aktif listeden arsivleyebilirsiniz.
            </p>

            <div className="mt-6 space-y-3">
              <div className="rounded-xl bg-surface-container-low px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
                  Son eklenen
                </p>
                <p className="mt-2 text-base font-semibold text-on-surface">
                  {profiles[profiles.length - 1]?.displayName ?? "-"}
                </p>
              </div>
              <div className="rounded-xl bg-surface-container-low px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
                  Sonraki adim
                </p>
                <p className="mt-2 text-sm leading-6 text-on-surface">
                  Yeni profil eklemek veya mevcut tercihleri guncellemek icin kurulum akisina donebilirsiniz.
                </p>
              </div>
            </div>
          </aside>
        </section>
      )}
    </main>
  );
}

function LoadingDisplay() {
  return (
    <section className="mx-auto w-full max-w-[1180px] px-6 py-10">
      <div className="rounded-2xl border border-outline-variant bg-white px-6 py-8 text-on-surface-variant">
        Yukleniyor...
      </div>
    </section>
  );
}

function ErrorDisplay({ message }: { message: string }) {
  return (
    <section className="mx-auto w-full max-w-[1180px] px-6 py-10">
      <div className="rounded-2xl border border-error-container bg-white px-6 py-8 text-error">
        {message}
      </div>
    </section>
  );
}
