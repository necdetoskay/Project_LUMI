"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { CanonicalCharacterImage } from "@/components/assets/canonical-character-image";

import styles from "./profiles-canonical.module.css";

type Profile = {
  id: string;
  householdId: string;
  displayName: string;
  ageBand: string;
  ageYears: number | null;
  locale: string;
  createdAt: string;
};

type CharacterInfo = {
  id: string;
  name: string;
};

type StoriesResponse = {
  adventureHub?: {
    ongoingAdventure?: { sessionId: string } | null;
    pastAdventures?: Array<{ sessionId: string }>;
  };
};

type WorldResponse = {
  world?: { id: string } | null;
};

type EnrichedProfile = Profile & {
  storyCount: number;
  activeStoryCount: number;
  characterCount: number;
  worldReady: boolean;
  primaryCharacter: CharacterInfo | null;
};

type DeleteMode = "archive" | "permanent";
type StoryFilter = "all" | "has_story" | "no_story";
type AgeSort = "default" | "age_asc" | "age_desc";
type ViewMode = "grid" | "list";

const EMPTY_ENRICHMENT = {
  storyCount: 0,
  activeStoryCount: 0,
  characterCount: 0,
  worldReady: false,
  primaryCharacter: null,
};

export default function ProfilesClientPage() {
  const [profiles, setProfiles] = useState<EnrichedProfile[]>([]);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [storyFilter, setStoryFilter] = useState<StoryFilter>("all");
  const [ageSort, setAgeSort] = useState<AgeSort>("default");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const [deleteTarget, setDeleteTarget] = useState<EnrichedProfile | null>(
    null,
  );
  const [deletingMode, setDeletingMode] = useState<DeleteMode | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const onboardingResponse = await fetch("/api/onboarding", {
          signal: controller.signal,
        });
        const onboardingData = (await onboardingResponse.json()) as {
          onboarding?: { hasHousehold: boolean; householdId: string | null };
        };
        const onboarding = onboardingData.onboarding;

        if (!onboarding?.hasHousehold || !onboarding.householdId) {
          setError("Aile evreni henüz oluşturulmamış.");
          return;
        }

        setHouseholdId(onboarding.householdId);
        const profileResponse = await fetch(
          `/api/child-profiles?householdId=${encodeURIComponent(onboarding.householdId)}`,
          { signal: controller.signal },
        );
        if (!profileResponse.ok) {
          throw new Error("PROFILE_LIST_FAILED");
        }

        const profileData = (await profileResponse.json()) as {
          profiles?: Profile[];
        };
        const baseProfiles = profileData.profiles ?? [];

        const enriched = await Promise.all(
          baseProfiles.map(async (profile): Promise<EnrichedProfile> => {
            try {
              const householdQuery = `householdId=${encodeURIComponent(onboarding.householdId!)}`;
              const [charactersResponse, storiesResponse, worldResponse] =
                await Promise.all([
                  fetch(
                    `/api/characters?${householdQuery}&childProfileId=${encodeURIComponent(profile.id)}`,
                    { signal: controller.signal },
                  ),
                  fetch(
                    `/api/child-profiles/${encodeURIComponent(profile.id)}/stories?${householdQuery}`,
                    { signal: controller.signal },
                  ),
                  fetch(
                    `/api/child-profiles/${encodeURIComponent(profile.id)}/world?${householdQuery}`,
                    { signal: controller.signal },
                  ),
                ]);

              const characters = charactersResponse.ok
                ? ((
                    (await charactersResponse.json()) as {
                      characters?: CharacterInfo[];
                    }
                  ).characters ?? [])
                : [];
              const stories = storiesResponse.ok
                ? ((await storiesResponse.json()) as StoriesResponse)
                : null;
              const world = worldResponse.ok
                ? (((await worldResponse.json()) as WorldResponse).world ??
                  null)
                : null;
              const ongoing = stories?.adventureHub?.ongoingAdventure ?? null;
              const past = stories?.adventureHub?.pastAdventures ?? [];

              return {
                ...profile,
                storyCount: past.length + (ongoing ? 1 : 0),
                activeStoryCount: ongoing ? 1 : 0,
                characterCount: characters.length,
                worldReady: Boolean(world),
                primaryCharacter: characters[0] ?? null,
              };
            } catch {
              return { ...profile, ...EMPTY_ENRICHMENT };
            }
          }),
        );

        if (!controller.signal.aborted) {
          setProfiles(enriched);
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(
            loadError instanceof Error &&
              loadError.message === "PROFILE_LIST_FAILED"
              ? "Profiller şu anda yüklenemedi. Biraz sonra tekrar deneyin."
              : "Profil verileri şu anda yüklenemedi. Biraz sonra tekrar deneyin.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!deleteTarget) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDeleteTarget(null);
        setDeleteError(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteTarget]);

  const totals = useMemo(
    () => ({
      profiles: profiles.length,
      activeStories: profiles.reduce(
        (total, profile) => total + profile.activeStoryCount,
        0,
      ),
      characters: profiles.reduce(
        (total, profile) => total + profile.characterCount,
        0,
      ),
      worlds: profiles.filter((profile) => profile.worldReady).length,
    }),
    [profiles],
  );

  const visibleProfiles = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");
    const filtered = profiles.filter((profile) => {
      const matchesQuery =
        !normalizedQuery ||
        profile.displayName
          .toLocaleLowerCase("tr-TR")
          .includes(normalizedQuery);
      const matchesStory =
        storyFilter === "all" ||
        (storyFilter === "has_story" && profile.storyCount > 0) ||
        (storyFilter === "no_story" && profile.storyCount === 0);
      return matchesQuery && matchesStory;
    });

    if (ageSort === "default") return filtered;
    return [...filtered].sort((left, right) => {
      const leftAge = left.ageYears ?? Number.MAX_SAFE_INTEGER;
      const rightAge = right.ageYears ?? Number.MAX_SAFE_INTEGER;
      return ageSort === "age_asc" ? leftAge - rightAge : rightAge - leftAge;
    });
  }, [ageSort, profiles, query, storyFilter]);

  async function handleDelete(mode: DeleteMode) {
    if (!deleteTarget || !householdId) return;

    setDeletingMode(mode);
    setDeleteError(null);

    const url =
      mode === "archive"
        ? `/api/child-profiles/archive/${encodeURIComponent(deleteTarget.id)}`
        : `/api/child-profiles/${encodeURIComponent(deleteTarget.id)}`;

    try {
      const response = await fetch(url, {
        method: mode === "archive" ? "POST" : "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ householdId }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        message?: string;
      };

      if (!response.ok) {
        setDeleteError(
          data.message ?? "İşlem başarısız oldu. Biraz sonra tekrar deneyin.",
        );
        return;
      }

      setProfiles((current) =>
        current.filter((profile) => profile.id !== deleteTarget.id),
      );
      setDeleteTarget(null);
    } catch {
      setDeleteError("İşlem başarısız oldu. Biraz sonra tekrar deneyin.");
    } finally {
      setDeletingMode(null);
    }
  }

  return (
    <div className={`lumi-profiles-canonical ${styles.page}`}>
      <style>{`
        body:has(.lumi-profiles-canonical) { background: #f8f8fc; }
        body:has(.lumi-profiles-canonical) > header,
        body:has(.lumi-profiles-canonical) > footer { display: none; }
        body:has(.lumi-profiles-canonical) > main { min-height: 100vh; }
      `}</style>

      <ProfilesSidebar />

      <main className={styles.main}>
        <div className={styles.breadcrumbs} aria-label="Sayfa konumu">
          <Link href="/app">Ana Sayfa</Link>
          <span className="material-symbols-outlined" aria-hidden="true">
            chevron_right
          </span>
          <strong>Çocuk Profilleri</strong>
        </div>

        <header className={styles.header}>
          <div>
            <h1>Çocuk Profilleri</h1>
            <p>
              Çocuklarınızın profillerini yönetin, yaşayan hikâye dünyalarına
              geçin.
            </p>
          </div>
          <div className={styles.headerActions}>
            <button
              className={styles.helpButton}
              type="button"
              aria-label="Profil sayfası yardımı"
              title="Her profil kendi karakter, hikâye ve dünya verisini ayrı tutar."
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                help
              </span>
            </button>
            <Link
              className={styles.primaryButton}
              href="/app/onboarding?addProfile=1"
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                add
              </span>
              Yeni Profil Ekle
            </Link>
          </div>
        </header>

        {loading ? (
          <StateCard icon="progress_activity" title="Profiller yükleniyor" />
        ) : error ? (
          <StateCard
            icon="error"
            title="Profiller yüklenemedi"
            message={error}
          />
        ) : (
          <>
            <section className={styles.kpiGrid} aria-label="Profil özeti">
              <KpiCard
                icon="groups"
                label="Toplam Profil"
                value={String(totals.profiles)}
                footnote="Aktif çocuk profilleri"
                accent="purple"
              />
              <KpiCard
                icon="check_circle"
                label="Aktif Hikayeler"
                value={String(totals.activeStories)}
                footnote="Devam eden hikâye"
                accent="green"
              />
              <KpiCard
                icon="face_6"
                label="Toplam Karakter"
                value={String(totals.characters)}
                footnote="Profillerdeki gerçek karakterler"
                accent="blue"
              />
              <KpiCard
                icon="public"
                label="Hazır Dünya"
                value={String(totals.worlds)}
                footnote="Oluşturulmuş yaşayan dünya"
                accent="amber"
              />
            </section>

            <section className={styles.toolbar} aria-label="Profil araçları">
              <label className={styles.searchBox}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  search
                </span>
                <input
                  type="search"
                  placeholder="Profil ara…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Profil ara"
                />
              </label>
              <div className={styles.toolbarSpacer} />
              <select
                className={styles.select}
                value={storyFilter}
                onChange={(event) =>
                  setStoryFilter(event.target.value as StoryFilter)
                }
                aria-label="Hikâye durumuna göre filtrele"
              >
                <option value="all">Tümü</option>
                <option value="has_story">Hikâyesi olan</option>
                <option value="no_story">Henüz hikâyesi yok</option>
              </select>
              <select
                className={styles.select}
                value={ageSort}
                onChange={(event) => setAgeSort(event.target.value as AgeSort)}
                aria-label="Yaşa göre sırala"
              >
                <option value="default">Yaşa Göre</option>
                <option value="age_asc">Küçükten büyüğe</option>
                <option value="age_desc">Büyükten küçüğe</option>
              </select>
              <div className={styles.viewToggle} aria-label="Görünüm seçimi">
                <button
                  type="button"
                  className={viewMode === "grid" ? styles.activeView : ""}
                  onClick={() => setViewMode("grid")}
                  aria-label="Kart görünümü"
                >
                  <span
                    className="material-symbols-outlined"
                    aria-hidden="true"
                  >
                    grid_view
                  </span>
                </button>
                <button
                  type="button"
                  className={viewMode === "list" ? styles.activeView : ""}
                  onClick={() => setViewMode("list")}
                  aria-label="Liste görünümü"
                >
                  <span
                    className="material-symbols-outlined"
                    aria-hidden="true"
                  >
                    view_list
                  </span>
                </button>
              </div>
            </section>

            {profiles.length === 0 ? (
              <section className={styles.emptyState} id="empty-state">
                <span className="material-symbols-outlined" aria-hidden="true">
                  person_add
                </span>
                <h2>Henüz bir çocuk profili yok</h2>
                <p>
                  İlk profili oluşturduğunuzda çocuğun karakteri, hikâyeleri ve
                  yaşayan dünyası burada tek kart üzerinden yönetilecek.
                </p>
                <Link
                  className={styles.primaryButton}
                  href="/app/onboarding?addProfile=1"
                >
                  İlk Profili Oluştur
                </Link>
              </section>
            ) : visibleProfiles.length === 0 ? (
              <section className={styles.emptyState}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  search_off
                </span>
                <h2>Bu filtreye uyan profil bulunamadı</h2>
                <p>
                  Arama metnini veya filtreleri değiştirerek tekrar deneyin.
                </p>
              </section>
            ) : (
              <section
                id="profile-container"
                className={`${styles.profileGrid} ${viewMode === "list" ? styles.listMode : ""}`}
              >
                {visibleProfiles.map((profile, index) => (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    householdId={householdId}
                    index={index}
                    onManage={() => {
                      setDeleteTarget(profile);
                      setDeleteError(null);
                    }}
                  />
                ))}
              </section>
            )}

            <section className={styles.createBanner}>
              <div className={styles.bannerIcon} aria-hidden="true">
                <span className="material-symbols-outlined">add_box</span>
              </div>
              <div>
                <h2>Yeni bir profil oluşturun</h2>
                <p>
                  Her çocuk için kişiselleştirilmiş yaşayan hikâye deneyimi.
                </p>
              </div>
              <Link
                className={styles.primaryButton}
                href="/app/onboarding?addProfile=1"
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  add
                </span>
                Yeni Profil Ekle
              </Link>
            </section>
          </>
        )}
      </main>

      {deleteTarget ? (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          onClick={() => {
            setDeleteTarget(null);
            setDeleteError(null);
          }}
        >
          <div
            className={styles.modal}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div className={styles.modalIcon} aria-hidden="true">
                <span className="material-symbols-outlined">delete</span>
              </div>
              <div>
                <h2 id="delete-dialog-title">Profili sil veya arşivle</h2>
                <p>
                  <strong>{deleteTarget.displayName}</strong> profiline ne
                  yapmak istiyorsunuz?
                </p>
              </div>
            </div>
            {deleteError ? (
              <p className={styles.errorText}>{deleteError}</p>
            ) : null}
            <div className={styles.modalActions}>
              <button
                className={styles.archiveButton}
                type="button"
                disabled={deletingMode !== null}
                onClick={() => void handleDelete("archive")}
              >
                {deletingMode === "archive" ? "Arşivleniyor…" : "Arşivle"}
              </button>
              <button
                className={styles.deleteButton}
                type="button"
                disabled={deletingMode !== null}
                onClick={() => void handleDelete("permanent")}
              >
                {deletingMode === "permanent"
                  ? "Kalıcı olarak siliniyor…"
                  : "Kalıcı olarak sil"}
              </button>
              <button
                className={styles.cancelButton}
                type="button"
                disabled={deletingMode !== null}
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError(null);
                }}
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProfilesSidebar() {
  return (
    <aside className={styles.sidebar}>
      <Link className={styles.brand} href="/app" aria-label="Project LUMI">
        <span className={styles.brandMark}>
          <span className="material-symbols-outlined" aria-hidden="true">
            auto_awesome
          </span>
        </span>
        <span className={styles.brandText}>
          <small>PROJECT</small>
          <strong>LUMI</strong>
        </span>
      </Link>

      <nav className={styles.nav} aria-label="Uygulama navigasyonu">
        <SidebarLink icon="dashboard" label="Dashboard" href="/app" />
        <SidebarLink
          icon="person"
          label="Karakter Onboarding"
          href="/app/character-onboarding"
        />
        <SidebarLink icon="menu_book" label="Hikayeler" href="/app" />
        <SidebarLink
          icon="image"
          label="Görsel Kütüphanesi"
          href="/app/assets"
        />
        <SidebarLink
          icon="science"
          label="Test Lab"
          href="/app/settings/test-lab"
        />
      </nav>

      <div className={styles.sidebarBottom}>
        <div className={styles.teamCard}>
          <div className={styles.teamAvatar}>L</div>
          <div>
            <strong>LUMI Ekibi</strong>
            <small>Pro Plan</small>
          </div>
          <span className="material-symbols-outlined" aria-hidden="true">
            expand_more
          </span>
        </div>
        <form action="/api/auth/logout" method="post">
          <button className={styles.logoutButton} type="submit">
            <span className="material-symbols-outlined" aria-hidden="true">
              logout
            </span>
            Çıkış Yap
          </button>
        </form>
      </div>
    </aside>
  );
}

function SidebarLink({
  icon,
  label,
  href,
}: {
  icon: string;
  label: string;
  href: string;
}) {
  return (
    <Link className={styles.navLink} href={href}>
      <span className="material-symbols-outlined" aria-hidden="true">
        {icon}
      </span>
      {label}
    </Link>
  );
}

function KpiCard({
  icon,
  label,
  value,
  footnote,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  footnote: string;
  accent: "purple" | "green" | "blue" | "amber";
}) {
  const accentClass = {
    purple: styles.kpiPurple,
    green: styles.kpiGreen,
    blue: styles.kpiBlue,
    amber: styles.kpiAmber,
  }[accent];

  return (
    <article className={styles.kpiCard}>
      <div className={`${styles.kpiIcon} ${accentClass}`} aria-hidden="true">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
      <em>{footnote}</em>
    </article>
  );
}

function ProfileCard({
  profile,
  householdId,
  index,
  onManage,
}: {
  profile: EnrichedProfile;
  householdId: string | null;
  index: number;
  onManage: () => void;
}) {
  const heroClass =
    index % 3 === 1
      ? styles.profileHeroAlt1
      : index % 3 === 2
        ? styles.profileHeroAlt2
        : "";
  const ageLabel =
    profile.ageYears === null ? profile.ageBand : `${profile.ageYears} yaş`;

  return (
    <article className={styles.profileCard}>
      <div className={`${styles.profileHero} ${heroClass}`}>
        {profile.primaryCharacter ? (
          <CanonicalCharacterImage
            characterId={profile.primaryCharacter.id}
            householdId={householdId}
            characterName={profile.primaryCharacter.name}
            className={styles.characterImage!}
            sizes="(min-width: 1120px) 28vw, (min-width: 800px) 44vw, 100vw"
            variant="body-three-quarter"
          />
        ) : (
          <div className={styles.fallbackAvatar} aria-hidden="true">
            <span className="material-symbols-outlined">face_6</span>
          </div>
        )}
        <button
          className={styles.cardMenu}
          type="button"
          aria-label={`${profile.displayName} profilini yönet`}
          title="Sil veya arşivle"
          onClick={onManage}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            more_vert
          </span>
        </button>
      </div>

      <div className={styles.cardBody}>
        <div className={styles.cardTitleRow}>
          <h2>{profile.displayName}</h2>
          <span className={styles.agePill}>{ageLabel}</span>
        </div>
        <p className={styles.cardDescription}>
          {profile.primaryCharacter
            ? `${profile.primaryCharacter.name} karakteriyle yaşayan hikâye dünyasına devam edin.`
            : "Karakterini oluşturup bu profile özel yaşayan hikâye dünyasını başlatın."}
        </p>

        <div className={styles.statsRow}>
          <ProfileStat
            icon="menu_book"
            value={profile.storyCount}
            label="Hikâye"
          />
          <ProfileStat
            icon="star"
            value={profile.characterCount}
            label="Karakter"
          />
          <ProfileStat
            icon="public"
            value={profile.worldReady ? "Hazır" : "—"}
            label="Dünya"
          />
        </div>

        <Link
          className={styles.profileButton}
          href={`/app/profiles/${encodeURIComponent(profile.id)}`}
        >
          Profili Görüntüle
          <span className="material-symbols-outlined" aria-hidden="true">
            chevron_right
          </span>
        </Link>
      </div>
    </article>
  );
}

function ProfileStat({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string | number;
  label: string;
}) {
  return (
    <div className={styles.stat}>
      <div className={styles.statLine}>
        <span className="material-symbols-outlined" aria-hidden="true">
          {icon}
        </span>
        {value}
      </div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

function StateCard({
  icon,
  title,
  message,
}: {
  icon: string;
  title: string;
  message?: string;
}) {
  return (
    <section className={styles.stateCard}>
      <span className="material-symbols-outlined" aria-hidden="true">
        {icon}
      </span>
      <h2>{title}</h2>
      {message ? <p>{message}</p> : null}
    </section>
  );
}
