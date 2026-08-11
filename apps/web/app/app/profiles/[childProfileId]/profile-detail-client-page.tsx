"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ProfileStoriesSection } from "@/components/story/profile-stories-section";
import { CanonicalCharacterImage } from "@/components/assets/canonical-character-image";

type Profile = {
  id: string;
  householdId: string;
  displayName: string;
  ageBand: string;
  locale: string;
  createdAt: string;
};

type CharacterInfo = {
  id: string;
  name: string;
  broadKind: string;
  characterType: string;
  subtype: string;
  createdAt: string;
};

export default function ProfileDetailClientPage({
  childProfileId,
}: {
  childProfileId: string;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [characters, setCharacters] = useState<CharacterInfo[]>([]);
  const [charactersLoading, setCharactersLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editAgeBand, setEditAgeBand] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const nextTab = new URLSearchParams(window.location.search).get("tab");
    if (
      nextTab &&
      ["overview", "characters", "stories", "preferences", "security"].includes(
        nextTab,
      )
    ) {
      setActiveTab(nextTab);
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const onboardRes = await fetch("/api/onboarding");
        const onboardData = await onboardRes.json();
        const onboarding = onboardData.onboarding as {
          hasHousehold: boolean;
          householdId: string | null;
        };

        if (!onboarding.hasHousehold || !onboarding.householdId) {
          setError("Household bulunamadi. Once onboarding akisini tamamlayin.");
          setLoading(false);
          return;
        }

        setHouseholdId(onboarding.householdId);

        const profileRes = await fetch(
          `/api/child-profiles/${encodeURIComponent(childProfileId)}?householdId=${onboarding.householdId}`,
        );

        if (!profileRes.ok) {
          if (profileRes.status === 404) {
            setError("Profil bulunamadi.");
          } else if (profileRes.status === 403) {
            setError("Bu profile erisim izniniz yok.");
          } else {
            setError("Profil yuklenemedi.");
          }
          setLoading(false);
          return;
        }

        const profileData = await profileRes.json();
        setProfile(profileData.profile);
        setEditDisplayName(profileData.profile.displayName);
        setEditAgeBand(profileData.profile.ageBand);

        setCharactersLoading(true);
        try {
          const charsRes = await fetch(
            `/api/characters?householdId=${onboarding.householdId}&childProfileId=${encodeURIComponent(childProfileId)}`,
          );
          if (charsRes.ok) {
            const charsData = await charsRes.json();
            setCharacters(charsData.characters ?? []);
          } else {
            setCharacters([]);
          }
        } catch {
          setCharacters([]);
        } finally {
          setCharactersLoading(false);
        }
      } catch {
        setError("Veri yuklenirken bir hata olustu.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [childProfileId]);

  const handleEditSubmit = useCallback(async () => {
    if (!householdId) return;

    setEditError(null);

    if (!editDisplayName.trim()) {
      setEditError("Gorunen ad zorunludur.");
      return;
    }

    if (!editAgeBand) {
      setEditError("Yas grubu secilmelidir.");
      return;
    }

    setEditSubmitting(true);

    try {
      const res = await fetch(
        `/api/child-profiles/${encodeURIComponent(childProfileId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            householdId,
            displayName: editDisplayName.trim(),
            ageBand: editAgeBand,
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json();
        setEditError(data.message ?? "Guncelleme basarisiz.");
        return;
      }

      const data = await res.json();
      setProfile(data.profile);
      setEditModalOpen(false);
    } catch {
      setEditError("Guncelleme sirasinda bir hata olustu.");
    } finally {
      setEditSubmitting(false);
    }
  }, [childProfileId, householdId, editDisplayName, editAgeBand]);

  const firstCharacter = useMemo(
    () => (characters.length > 0 ? characters[0] : null),
    [characters],
  );

  if (loading) return <LoadingDisplay />;
  if (error) return <ErrorDisplay message={error} />;
  if (!profile) return <ErrorDisplay message="Profil bulunamadi." />;

  const ageBandLabel = getAgeBandLabel(profile.ageBand);

  return (
    <main className="mx-auto flex w-full max-w-[1180px] flex-col px-6 py-10">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm font-semibold text-on-surface-variant">
        <a className="transition-colors hover:text-primary" href="/app">
          Dashboard
        </a>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <a
          className="transition-colors hover:text-primary"
          href="/app/profiles"
        >
          Profiller
        </a>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <span className="text-primary">{profile.displayName}</span>
      </nav>

      <header className="mb-8 rounded-2xl border border-outline-variant bg-white p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-fixed text-primary">
              <span className="material-symbols-outlined text-[32px]">
                face
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
                Cocuk profili
              </p>
              <h1 className="mt-2 text-2xl font-extrabold text-on-surface md:text-3xl">
                {profile.displayName}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-on-surface-variant">
                <MetaPill icon="cake" label={ageBandLabel} />
                <MetaPill icon="language" label={profile.locale} />
                <MetaPill
                  icon="calendar_month"
                  label={new Date(profile.createdAt).toLocaleDateString(
                    "tr-TR",
                  )}
                />
                {firstCharacter ? (
                  <MetaPill icon="auto_awesome" label={firstCharacter.name} />
                ) : (
                  <MetaPill icon="rocket_launch" label="Karakter bekleniyor" />
                )}
              </div>
              <p className="mt-4 max-w-[42rem] text-sm leading-6 text-on-surface-variant">
                Profil, karakter, dunya ve hikaye akislari buradan yonetilir. En
                sik yapilan adimlar hemen asagida toplandi.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-4 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container"
              type="button"
              onClick={() => {
                setEditDisplayName(profile.displayName);
                setEditAgeBand(profile.ageBand);
                setEditError(null);
                setEditModalOpen(true);
              }}
            >
              <span className="material-symbols-outlined text-[18px]">
                edit
              </span>
              Profili duzenle
            </button>
            <a
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-outline-variant bg-white px-4 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low"
              href={`/app/profiles/${encodeURIComponent(childProfileId)}/world`}
            >
              <span className="material-symbols-outlined text-[18px]">
                travel_explore
              </span>
              Haritayi incele
            </a>
            <a
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-outline-variant bg-white px-4 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low"
              href="/app/profiles"
            >
              <span className="material-symbols-outlined text-[18px]">
                arrow_back
              </span>
              Profillere don
            </a>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <QuickActionCard
            title="Harita"
            description="Gorunen bolgeleri, su anki konumu ve canta ozetini inceleyin."
            href={`/app/profiles/${encodeURIComponent(childProfileId)}/world`}
            icon="map"
            cta="Haritayi ac"
          />
          <QuickActionCard
            title="Hikayeler"
            description="Devam eden oturumlari gorun ve yeni hikaye akislarini acin."
            href={`#stories`}
            icon="auto_stories"
            cta="Hikayelere git"
            onClick={() => setActiveTab("stories")}
          />
          {firstCharacter ? (
            <QuickActionCard
              title="Karakter"
              description={`${firstCharacter.name} hazir. Karakter detaylari asagida.`}
              href="#characters"
              icon="sparkles"
              cta="Karakterleri gor"
              onClick={() => setActiveTab("characters")}
            />
          ) : (
            <QuickActionCard
              title="Karakter"
              description="Bu profil icin ilk karakteri baslatin."
              href={`/app/character-onboarding?childProfileId=${encodeURIComponent(childProfileId)}`}
              icon="sparkles"
              cta="Karakter baslat"
            />
          )}
        </div>
      </header>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-outline-variant pb-2">
        <TabButton
          label="Genel bakis"
          tab="overview"
          active={activeTab === "overview"}
          onClick={setActiveTab}
        />
        <TabButton
          label={`Karakterler${characters.length > 0 ? ` (${characters.length})` : ""}`}
          tab="characters"
          active={activeTab === "characters"}
          onClick={setActiveTab}
        />
        <TabButton
          label="Hikayeler"
          tab="stories"
          active={activeTab === "stories"}
          onClick={setActiveTab}
        />
        <TabButton
          label="Tercihler"
          tab="preferences"
          active={activeTab === "preferences"}
          onClick={setActiveTab}
        />
        <TabButton
          label="Guvenlik"
          tab="security"
          active={activeTab === "security"}
          onClick={setActiveTab}
        />
      </div>

      {activeTab === "overview" && (
        <OverviewSection profile={profile} childProfileId={childProfileId} />
      )}
      {activeTab === "characters" && (
        <CharactersSection
          characters={characters}
          loading={charactersLoading}
          childProfileId={childProfileId}
          householdId={householdId}
        />
      )}
      {activeTab === "stories" && (
        <section id="stories">
          <ProfileStoriesSection childProfileId={childProfileId} />
        </section>
      )}
      {activeTab === "preferences" && <PreferencesSection />}
      {activeTab === "security" && <SecuritySection />}

      {editModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-on-surface">
              Profili duzenle
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              {profile.displayName} icin temel bilgileri guncelleyin.
            </p>

            {editError ? (
              <div className="mt-4 rounded-lg border border-error-container bg-destructive-soft px-4 py-3 text-sm text-error">
                {editError}
              </div>
            ) : null}

            <div className="mt-6 space-y-4">
              <FieldLabel htmlFor="edit-name" label="Gorunen ad" />
              <input
                className="w-full rounded-lg border border-outline-variant px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                id="edit-name"
                type="text"
                value={editDisplayName}
                onChange={(event) => setEditDisplayName(event.target.value)}
                placeholder="Cocugun adi"
              />

              <div>
                <FieldLabel htmlFor="edit-age" label="Yas grubu" />
                <select
                  className="w-full rounded-lg border border-outline-variant px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                  id="edit-age"
                  value={editAgeBand}
                  onChange={(event) => setEditAgeBand(event.target.value)}
                >
                  <option value="">Seciniz</option>
                  <option value="0-2">0-2 yas</option>
                  <option value="3-5">3-5 yas</option>
                  <option value="6-8">6-8 yas</option>
                  <option value="9-12">9-12 yas</option>
                  <option value="13+">13+ yas</option>
                </select>
              </div>

              <div>
                <FieldLabel htmlFor="edit-locale" label="Dil" />
                <input
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant"
                  id="edit-locale"
                  type="text"
                  value={profile.locale}
                  disabled
                />
                <p className="mt-1 text-xs text-on-surface-variant">
                  Dil degisikligi su anda desteklenmiyor.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="inline-flex h-10 items-center rounded-lg border border-outline-variant bg-white px-4 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low"
                type="button"
                onClick={() => setEditModalOpen(false)}
              >
                Iptal
              </button>
              <button
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-[#4c29cf] disabled:opacity-50"
                type="button"
                onClick={handleEditSubmit}
                disabled={editSubmitting}
              >
                {editSubmitting ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function TabButton({
  label,
  tab,
  active,
  onClick,
}: {
  label: string;
  tab: string;
  active: boolean;
  onClick: (tab: string) => void;
}) {
  return (
    <button
      className={[
        "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
        active
          ? "bg-primary text-on-primary"
          : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
      ].join(" ")}
      type="button"
      onClick={() => onClick(tab)}
    >
      {label}
    </button>
  );
}

function OverviewSection({
  profile,
  childProfileId,
}: {
  profile: Profile;
  childProfileId: string;
}) {
  const ageBandLabel = getAgeBandLabel(profile.ageBand);

  return (
    <section className="space-y-6 rounded-2xl border border-outline-variant bg-white p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-on-surface">Genel bakis</h2>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
            Profil durumu, temel bilgiler ve dunyaya gecis buradan baslar.
          </p>
        </div>
        <a
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-outline-variant bg-white px-4 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low"
          href={`/app/profiles/${encodeURIComponent(childProfileId)}/world`}
        >
          <span className="material-symbols-outlined text-[18px]">
            travel_explore
          </span>
          Haritayi incele
        </a>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)]">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <InfoCard
            label="Gorunen ad"
            value={profile.displayName}
            icon="badge"
          />
          <InfoCard label="Yas grubu" value={ageBandLabel} icon="cake" />
          <InfoCard
            label="Dil / Locale"
            value={profile.locale}
            icon="language"
          />
          <InfoCard label="Profil durumu" value="Aktif" icon="check_circle" />
          <InfoCard
            label="Aile evreni"
            value={profile.householdId.slice(0, 8) + "..."}
            icon="public"
          />
          <InfoCard
            label="Olusturma"
            value={new Date(profile.createdAt).toLocaleDateString("tr-TR")}
            icon="calendar_month"
          />
        </div>

        <section className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
          <h3 className="text-lg font-bold text-on-surface">Hizli rota</h3>
          <div className="mt-4 space-y-3">
            <ActionRow
              title="Dunyayi kontrol et"
              description="Karakterin hangi bolgede oldugunu ve gorunen konumlari inceleyin."
              href={`/app/profiles/${encodeURIComponent(childProfileId)}/world`}
              icon="map"
            />
            <ActionRow
              title="Hikaye oturumlarini ac"
              description="Devam eden maceralari buradan surdurmek daha hizli olur."
              href="#stories"
              icon="menu_book"
            />
            <ActionRow
              title="Karakter akisini tamamla"
              description="Eksikse karakter olusturun, varsa karakter sekmesini acin."
              href={`/app/character-onboarding?childProfileId=${encodeURIComponent(childProfileId)}`}
              icon="sparkles"
            />
          </div>
        </section>
      </div>
    </section>
  );
}

function CharactersSection({
  characters,
  loading,
  childProfileId,
  householdId,
}: {
  characters: CharacterInfo[];
  loading: boolean;
  childProfileId: string;
  householdId: string | null;
}) {
  const firstCharacter = characters[0] ?? null;
  if (loading) {
    return (
      <section className="rounded-2xl border border-outline-variant bg-white p-6 md:p-8">
        <p className="text-sm text-on-surface-variant">
          Karakterler yukleniyor...
        </p>
      </section>
    );
  }

  if (characters.length === 0) {
    return (
      <section className="rounded-2xl border border-outline-variant bg-white p-6 md:p-8">
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-8 py-14 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-fixed text-primary">
            <span className="material-symbols-outlined text-[32px]">
              auto_awesome
            </span>
          </div>
          <h3 className="text-xl font-bold text-on-surface">
            Henuz karakter yok
          </h3>
          <p className="mx-auto mt-2 max-w-[30rem] text-sm leading-6 text-on-surface-variant">
            Bu profil icin henuz karakter olusturulmamis. Ilk karakteri
            baslatarak macerayi hareketlendirin.
          </p>
          <a
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary transition-colors hover:bg-[#4c29cf]"
            href={`/app/character-onboarding?childProfileId=${encodeURIComponent(childProfileId)}`}
          >
            <span className="material-symbols-outlined text-[20px]">
              rocket_launch
            </span>
            Ilk karakteri baslat
          </a>
        </div>
      </section>
    );
  }

  return (
    <section
      id="characters"
      className="rounded-2xl border border-outline-variant bg-white p-6 md:p-8"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-on-surface">Karakterler</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Bu profilde aktif olan karakterler ve temel rolleri.
          </p>
        </div>
        {firstCharacter ? (
          <a
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-[#4c29cf]"
            href={`/app/profiles/${encodeURIComponent(childProfileId)}/characters/${encodeURIComponent(firstCharacter.id)}`}
          >
            <span className="material-symbols-outlined text-[18px]">
              open_in_new
            </span>
            Karakteri ac
          </a>
        ) : (
          <a
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-[#4c29cf]"
            href={`/app/character-onboarding?childProfileId=${encodeURIComponent(childProfileId)}`}
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Yeni karakter baslat
          </a>
        )}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {characters.map((character) => (
          <article
            key={character.id}
            className="rounded-xl border border-outline-variant bg-surface-container-low p-5"
          >
            <div className="flex items-start gap-4">
              <CanonicalCharacterImage
                characterId={character.id}
                characterName={character.name}
                className="h-16 w-16 shrink-0 rounded-2xl"
                householdId={householdId}
                sizes="64px"
                variant="head-three-quarter"
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-on-surface">
                  {character.name}
                </h3>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {getCharacterTypeLabel(character.characterType)} |{" "}
                  {character.subtype}
                </p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Olusturma:{" "}
                  {new Date(character.createdAt).toLocaleDateString("tr-TR")}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container"
                href={`/app/profiles/${encodeURIComponent(childProfileId)}/characters/${encodeURIComponent(character.id)}`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  open_in_new
                </span>
                Karakter detayi
              </a>
              <a
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-outline-variant bg-white px-4 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container"
                href={`/app/profiles/${encodeURIComponent(childProfileId)}?tab=stories`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  menu_book
                </span>
                Hikayelere git
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PreferencesSection() {
  return (
    <section className="rounded-2xl border border-outline-variant bg-white p-6 md:p-8">
      <h2 className="text-xl font-bold text-on-surface">Tercihler</h2>
      <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-8 py-14 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-container text-on-surface-variant">
          <span className="material-symbols-outlined text-[32px]">tune</span>
        </div>
        <h3 className="text-xl font-bold text-on-surface">
          Tercihler henuz tanimlanmadi
        </h3>
        <p className="mx-auto mt-2 max-w-[30rem] text-sm leading-6 text-on-surface-variant">
          Hikaye temalari, karakter tercihleri ve benzer ayarlar sonraki
          adimlarda bu ekrana baglanacak.
        </p>
      </div>
    </section>
  );
}

function SecuritySection() {
  return (
    <section className="rounded-2xl border border-outline-variant bg-white p-6 md:p-8">
      <h2 className="text-xl font-bold text-on-surface">Guvenlik</h2>
      <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-8 py-14 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-container text-on-surface-variant">
          <span className="material-symbols-outlined text-[32px]">shield</span>
        </div>
        <h3 className="text-xl font-bold text-on-surface">
          Ebeveyn politikasi aktif
        </h3>
        <p className="mx-auto mt-2 max-w-[30rem] text-sm leading-6 text-on-surface-variant">
          Cocuk profili guvenlik ayarlari aile duzeyindeki ebeveyn politikasi
          ile yonetilir. Icerik siniri, günlük kullanim ve tema tercihleri
          ebeveyn panelinden yapilandirilir.
        </p>
        <a
          href="/app/settings/safety"
          className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-6 text-sm font-semibold text-on-primary transition-colors hover:bg-[#4c29cf]"
        >
          Guvenlik Ayarlarini Ac
        </a>
      </div>
    </section>
  );
}

function QuickActionCard({
  title,
  description,
  href,
  icon,
  cta,
  onClick,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
  cta: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-container text-primary">
        <span className="material-symbols-outlined text-[22px]">{icon}</span>
      </div>
      <div className="mt-4">
        <h2 className="text-base font-bold text-on-surface">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
          {description}
        </p>
      </div>
      <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
        <span>{cta}</span>
        <span className="material-symbols-outlined text-[18px]">
          arrow_forward
        </span>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        className="rounded-xl border border-outline-variant bg-surface-container-low p-5 text-left transition-colors hover:border-primary/30 hover:bg-white"
        type="button"
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return (
    <a
      className="rounded-xl border border-outline-variant bg-surface-container-low p-5 transition-colors hover:border-primary/30 hover:bg-white"
      href={href}
    >
      {content}
    </a>
  );
}

function ActionRow({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
}) {
  return (
    <a
      className="flex items-start gap-3 rounded-lg border border-outline-variant bg-white p-4 transition-colors hover:border-primary/30"
      href={href}
    >
      <span className="material-symbols-outlined text-[20px] text-primary">
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-on-surface">{title}</p>
        <p className="mt-1 text-sm leading-6 text-on-surface-variant">
          {description}
        </p>
      </div>
    </a>
  );
}

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px] text-primary">
          {icon}
        </span>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
          {label}
        </p>
      </div>
      <p className="mt-2 text-base font-semibold text-on-surface">{value}</p>
    </div>
  );
}

function MetaPill({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-low px-3 py-1 text-sm text-on-surface-variant">
      <span className="material-symbols-outlined text-[16px]">{icon}</span>
      {label}
    </span>
  );
}

function FieldLabel({ htmlFor, label }: { htmlFor: string; label: string }) {
  return (
    <label
      className="mb-1 block text-sm font-semibold text-on-surface"
      htmlFor={htmlFor}
    >
      {label}
    </label>
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

function getAgeBandLabel(band: string): string {
  const labels: Record<string, string> = {
    "0-2": "0-2 yas",
    "3-5": "3-5 yas",
    "6-8": "6-8 yas",
    "9-12": "9-12 yas",
    "13+": "13+ yas",
  };
  return labels[band] ?? band;
}

function getCharacterTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    explorer: "Kasif",
    inventor: "Mucit",
    storyteller: "Hikayeci",
    helper: "Yardimci",
    dreamer: "Ruyaci",
  };
  return labels[type] ?? type;
}
