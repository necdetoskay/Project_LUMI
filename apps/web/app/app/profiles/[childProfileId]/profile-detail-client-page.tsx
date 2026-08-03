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

type CharacterInfo = {
  id: string;
  name: string;
  broadKind: string;
  characterType: string;
  subtype: string;
  createdAt: string;
};

export default function ProfileDetailClientPage({ childProfileId }: { childProfileId: string }) {
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
    async function load() {
      try {
        const onboardRes = await fetch("/api/onboarding");
        const onboardData = await onboardRes.json();
        const s = onboardData.onboarding as { hasHousehold: boolean; householdId: string | null };

        if (!s.hasHousehold || !s.householdId) {
          setError("No household found. Complete onboarding first.");
          setLoading(false);
          return;
        }

        setHouseholdId(s.householdId);

        const profileRes = await fetch(`/api/child-profiles/${encodeURIComponent(childProfileId)}?householdId=${s.householdId}`);

        if (!profileRes.ok) {
          if (profileRes.status === 404) {
            setError("Profil bulunamadı.");
          } else if (profileRes.status === 403) {
            setError("Bu profile erişim izniniz yok.");
          } else {
            setError("Profil yüklenemedi.");
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
          const charsRes = await fetch(`/api/characters?householdId=${s.householdId}&childProfileId=${encodeURIComponent(childProfileId)}`);
          if (charsRes.ok) {
            const charsData = await charsRes.json();
            setCharacters(charsData.characters ?? []);
          }
        } catch {
          setCharacters([]);
        } finally {
          setCharactersLoading(false);
        }
      } catch {
        setError("Veri yüklenirken bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [childProfileId]);

  const handleEditSubmit = useCallback(async () => {
    if (!householdId) return;

    setEditError(null);

    if (!editDisplayName.trim()) {
      setEditError("Görünen ad zorunludur.");
      return;
    }

    if (!editAgeBand) {
      setEditError("Yaş grubu seçilmelidir.");
      return;
    }

    setEditSubmitting(true);

    try {
      const res = await fetch(`/api/child-profiles/${encodeURIComponent(childProfileId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdId,
          displayName: editDisplayName.trim(),
          ageBand: editAgeBand,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setEditError(data.message ?? "Güncelleme başarısız.");
        return;
      }

      const data = await res.json();
      setProfile(data.profile);
      setEditModalOpen(false);
    } catch {
      setEditError("Güncelleme sırasında bir hata oluştu.");
    } finally {
      setEditSubmitting(false);
    }
  }, [childProfileId, householdId, editDisplayName, editAgeBand]);

  if (loading) return <LoadingDisplay />;
  if (error) return <ErrorDisplay message={error} />;
  if (!profile) return <ErrorDisplay message="Profil bulunamadı." />;

  const ageBandLabel = getAgeBandLabel(profile.ageBand);
  const firstCharacter = characters.length > 0 ? characters[0] : null;

  return (
    <main className="mx-auto flex w-full max-w-[1180px] flex-col px-6 py-10">
      <nav className="mb-6 flex items-center gap-2 text-sm font-semibold text-on-surface-variant">
        <a className="transition-colors hover:text-primary" href="/app">Dashboard</a>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <a className="transition-colors hover:text-primary" href="/app/profiles">Profiller</a>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <span className="text-primary">{profile.displayName}</span>
      </nav>

      <header className="mb-8 flex flex-col gap-6 rounded-2xl border border-outline-variant bg-white p-6 md:flex-row md:items-start md:justify-between md:p-8">
        <div className="flex items-start gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-fixed text-primary">
            <span className="material-symbols-outlined text-[32px]">face</span>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-on-surface md:text-3xl">
              {profile.displayName}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-on-surface-variant">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">cake</span>
                {ageBandLabel}
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">language</span>
                {profile.locale}
              </span>
              {firstCharacter && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                  {firstCharacter.name}
                </span>
              )}
            </div>
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
            <span className="material-symbols-outlined text-[18px]">edit</span>
            Profili düzenle
          </button>
          <a
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-outline-variant bg-white px-4 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low"
            href="/app/profiles"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Profiller listesine dön
          </a>
        </div>
      </header>

      <div className="mb-6 flex border-b border-outline-variant">
        <TabButton label="Genel Bakış" tab="overview" active={activeTab === "overview"} onClick={setActiveTab} />
        <TabButton label="Karakterler" tab="characters" active={activeTab === "characters"} onClick={setActiveTab} />
        <TabButton label="Hikayeler" tab="stories" active={activeTab === "stories"} onClick={setActiveTab} />
        <TabButton label="Tercihler" tab="preferences" active={activeTab === "preferences"} onClick={setActiveTab} />
        <TabButton label="Güvenlik" tab="security" active={activeTab === "security"} onClick={setActiveTab} />
      </div>

      {activeTab === "overview" && (
        <OverviewSection profile={profile} />
      )}
      {activeTab === "characters" && (
        <CharactersSection
          characters={characters}
          loading={charactersLoading}
          childProfileId={childProfileId}
        />
      )}
      {activeTab === "stories" && (
        <StoriesSection />
      )}
      {activeTab === "preferences" && (
        <PreferencesSection />
      )}
      {activeTab === "security" && (
        <SecuritySection />
      )}

      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-on-surface">Profili düzenle</h2>
            <p className="mt-1 text-sm text-on-surface-variant">{profile.displayName} için bilgileri güncelleyin.</p>

            {editError && (
              <div className="mt-4 rounded-lg border border-error-container bg-destructive-soft px-4 py-3 text-sm text-error">
                {editError}
              </div>
            )}

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-on-surface" htmlFor="edit-name">
                  Görünen ad
                </label>
                <input
                  className="w-full rounded-lg border border-outline-variant px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                  id="edit-name"
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="Çocuğun adı"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-on-surface" htmlFor="edit-age">
                  Yaş grubu
                </label>
                <select
                  className="w-full rounded-lg border border-outline-variant px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                  id="edit-age"
                  value={editAgeBand}
                  onChange={(e) => setEditAgeBand(e.target.value)}
                >
                  <option value="">Seçiniz</option>
                  <option value="0-2">0-2 yaş</option>
                  <option value="3-5">3-5 yaş</option>
                  <option value="6-8">6-8 yaş</option>
                  <option value="9-12">9-12 yaş</option>
                  <option value="13+">13+ yaş</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-on-surface" htmlFor="edit-locale">
                  Dil
                </label>
                <input
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant"
                  id="edit-locale"
                  type="text"
                  value={profile.locale}
                  disabled
                />
                <p className="mt-1 text-xs text-on-surface-variant">Dil değişikliği şu anda desteklenmiyor.</p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="inline-flex h-10 items-center rounded-lg border border-outline-variant bg-white px-4 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low"
                type="button"
                onClick={() => setEditModalOpen(false)}
              >
                İptal
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
      )}
    </main>
  );
}

function TabButton({ label, tab, active, onClick }: { label: string; tab: string; active: boolean; onClick: (tab: string) => void }) {
  return (
    <button
      className={`px-4 py-3 text-sm font-semibold transition-colors ${
        active
          ? "border-b-2 border-primary text-primary"
          : "border-b-2 border-transparent text-on-surface-variant hover:text-on-surface"
      }`}
      type="button"
      onClick={() => onClick(tab)}
    >
      {label}
    </button>
  );
}

function OverviewSection({ profile }: { profile: Profile }) {
  const ageBandLabel = getAgeBandLabel(profile.ageBand);
  return (
    <section className="rounded-2xl border border-outline-variant bg-white p-6 md:p-8">
      <h2 className="text-xl font-bold text-on-surface">Genel Bakış</h2>
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard label="Görünen ad" value={profile.displayName} icon="badge" />
        <InfoCard label="Yaş grubu" value={ageBandLabel} icon="cake" />
        <InfoCard label="Dil / Locale" value={profile.locale} icon="language" />
        <InfoCard label="Profil durumu" value="Aktif" icon="check_circle" />
        <InfoCard label="Aile evreni" value={profile.householdId.slice(0, 8) + "..."} icon="public" />
        <InfoCard label="Oluşturma" value={new Date(profile.createdAt).toLocaleDateString("tr-TR")} icon="calendar_month" />
      </div>
    </section>
  );
}

function CharactersSection({ characters, loading, childProfileId }: { characters: CharacterInfo[]; loading: boolean; childProfileId: string }) {
  if (loading) {
    return (
      <section className="rounded-2xl border border-outline-variant bg-white p-6 md:p-8">
        <p className="text-sm text-on-surface-variant">Karakterler yükleniyor...</p>
      </section>
    );
  }

  if (characters.length === 0) {
    return (
      <section className="rounded-2xl border border-outline-variant bg-white p-6 md:p-8">
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-8 py-14 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-fixed text-primary">
            <span className="material-symbols-outlined text-[32px]">auto_awesome</span>
          </div>
          <h3 className="text-xl font-bold text-on-surface">Henüz karakter yok</h3>
          <p className="mx-auto mt-2 max-w-[30rem] text-sm leading-6 text-on-surface-variant">
            Bu profil için henüz karakter oluşturulmamış. İlk karakteri başlatarak maceraya adım atın.
          </p>
          <a
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary transition-colors hover:bg-[#4c29cf]"
            href={`/app/character-onboarding?childProfileId=${encodeURIComponent(childProfileId)}`}
          >
            <span className="material-symbols-outlined text-[20px]">rocket_launch</span>
            İlk karakteri başlat
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-outline-variant bg-white p-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-on-surface">Karakterler</h2>
        <a
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-[#4c29cf]"
          href={`/app/character-onboarding?childProfileId=${encodeURIComponent(childProfileId)}`}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Yeni karakter başlat
        </a>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {characters.map((c) => (
          <article key={c.id} className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-tertiary-fixed text-tertiary">
                <span className="material-symbols-outlined text-[24px]">magic</span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-on-surface">{c.name}</h3>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {getCharacterTypeLabel(c.characterType)} &middot; {c.subtype}
                </p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Oluşturma: {new Date(c.createdAt).toLocaleDateString("tr-TR")}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function StoriesSection() {
  return (
    <section className="rounded-2xl border border-outline-variant bg-white p-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-on-surface">Hikayeler</h2>
        <button
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-4 text-sm font-semibold text-on-surface-variant opacity-50"
          type="button"
          disabled
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Yeni hikaye başlat
        </button>
      </div>
      <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-8 py-14 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-container text-on-surface-variant">
          <span className="material-symbols-outlined text-[32px]">menu_book</span>
        </div>
        <h3 className="text-xl font-bold text-on-surface">Henüz hikaye yok</h3>
        <p className="mx-auto mt-2 max-w-[30rem] text-sm leading-6 text-on-surface-variant">
          Hikaye geçmişi sonraki sprintlerde bağlanacak. Şu anda hikaye oluşturma ve görüntüleme
          özelliği kullanıma hazır değil.
        </p>
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
        <h3 className="text-xl font-bold text-on-surface">Tercihler henüz tanımlanmadı</h3>
        <p className="mx-auto mt-2 max-w-[30rem] text-sm leading-6 text-on-surface-variant">
          Bu profil için hikaye temaları, karakter türü tercihleri ve diğer ayarlar
          sonraki sürümlerde eklenecek.
        </p>
      </div>
    </section>
  );
}

function SecuritySection() {
  return (
    <section className="rounded-2xl border border-outline-variant bg-white p-6 md:p-8">
      <h2 className="text-xl font-bold text-on-surface">Güvenlik</h2>
      <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-8 py-14 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-container text-on-surface-variant">
          <span className="material-symbols-outlined text-[32px]">shield</span>
        </div>
        <h3 className="text-xl font-bold text-on-surface">Ebeveyn politikası aktif</h3>
        <p className="mx-auto mt-2 max-w-[30rem] text-sm leading-6 text-on-surface-variant">
          Çocuk profili güvenlik ayarları, aile evreni düzeyindeki ebeveyn politikası tarafından
          yönetilir. Politika detaylarını görüntülemek ve düzenlemek için ebeveyn panelini kullanın.
        </p>
      </div>
    </section>
  );
}

function InfoCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px] text-primary">{icon}</span>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">{label}</p>
      </div>
      <p className="mt-2 text-base font-semibold text-on-surface">{value}</p>
    </div>
  );
}

function LoadingDisplay() {
  return (
    <section className="mx-auto w-full max-w-[1180px] px-6 py-10">
      <div className="rounded-2xl border border-outline-variant bg-white px-6 py-8 text-on-surface-variant">
        Yükleniyor...
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
    "0-2": "0-2 yaş",
    "3-5": "3-5 yaş",
    "6-8": "6-8 yaş",
    "9-12": "9-12 yaş",
    "13+": "13+ yaş",
  };
  return labels[band] ?? band;
}

function getCharacterTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    explorer: "Kaşif",
    inventor: "Mucit",
    storyteller: "Hikayeci",
    helper: "Yardımcı",
    dreamer: "Rüyacı",
  };
  return labels[type] ?? type;
}
