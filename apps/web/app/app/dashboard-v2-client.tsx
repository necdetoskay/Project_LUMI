"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { CanonicalCharacterImage } from "@/components/assets/canonical-character-image";

import styles from "./dashboard-v2.module.css";

type CharacterInfo = {
  id: string;
  name: string;
  broadKind: string;
  characterType: string;
  subtype: string;
};

type AdventureSummary = {
  sessionId: string;
  title: string;
  semanticState: "ongoing" | "completed" | "archived";
  playerRecap: string;
  currentSceneTitle: string | null;
  highlights: Array<{
    kind: "location" | "item" | "companion" | "clue";
    label: string;
  }>;
};

type StoriesResponse = {
  launchOptions?: Array<{
    character: CharacterInfo;
    world: { id: string; label: string } | null;
    currentLocation: { id: string; displayName: string } | null;
  }>;
  adventureHub?: {
    ongoingAdventure: AdventureSummary | null;
    pastAdventures: AdventureSummary[];
  };
};

type WorldResponse = {
  world?: {
    id: string;
    currentLocation: { id: string; displayName: string } | null;
    regions: Array<{
      id: string;
      displayName: string;
      isCurrentRegion: boolean;
    }>;
  } | null;
};

type Personalization = {
  interests?: string[];
  customInterests?: string[];
};

type DashboardData = {
  characters: CharacterInfo[];
  stories: StoriesResponse | null;
  world: WorldResponse["world"];
  personalization: Personalization;
};

const EMPTY: DashboardData = {
  characters: [],
  stories: null,
  world: null,
  personalization: {},
};

export default function DashboardV2Client({
  parentName,
  householdId,
  childProfileId,
  childName,
  ageBand,
}: {
  parentName: string;
  householdId: string;
  childProfileId: string;
  childName: string;
  ageBand: string;
}) {
  const [data, setData] = useState<DashboardData>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const query = `householdId=${encodeURIComponent(householdId)}`;

    async function load() {
      try {
        const [charactersResponse, storiesResponse, worldResponse, personalizationResponse] =
          await Promise.all([
            fetch(
              `/api/characters?${query}&childProfileId=${encodeURIComponent(childProfileId)}`,
              { signal: controller.signal },
            ),
            fetch(
              `/api/child-profiles/${encodeURIComponent(childProfileId)}/stories?${query}`,
              { signal: controller.signal },
            ),
            fetch(
              `/api/child-profiles/${encodeURIComponent(childProfileId)}/world?${query}`,
              { signal: controller.signal },
            ),
            fetch(
              `/api/child-profiles/${encodeURIComponent(childProfileId)}/personalization?${query}`,
              { signal: controller.signal },
            ),
          ]);

        const characters = charactersResponse.ok
          ? (((await charactersResponse.json()) as { characters?: CharacterInfo[] })
              .characters ?? [])
          : [];
        const stories = storiesResponse.ok
          ? ((await storiesResponse.json()) as StoriesResponse)
          : null;
        const world = worldResponse.ok
          ? (((await worldResponse.json()) as WorldResponse).world ?? null)
          : null;
        const personalization = personalizationResponse.ok
          ? (((await personalizationResponse.json()) as {
              personalization?: Personalization;
            }).personalization ?? {})
          : {};

        if (!controller.signal.aborted) {
          setData({ characters, stories, world, personalization });
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [childProfileId, householdId]);

  const primaryCharacter = data.characters[0] ?? null;
  const ongoing = data.stories?.adventureHub?.ongoingAdventure ?? null;
  const past = data.stories?.adventureHub?.pastAdventures ?? [];
  const launch = data.stories?.launchOptions?.[0] ?? null;
  const currentRegion =
    data.world?.regions.find((region) => region.isCurrentRegion) ?? null;
  const worldLabel =
    data.world?.currentLocation?.displayName ??
    currentRegion?.displayName ??
    launch?.world?.label ??
    null;
  const interests = useMemo(
    () => [
      ...(data.personalization.interests ?? []),
      ...(data.personalization.customInterests ?? []),
    ].slice(0, 5),
    [data.personalization.customInterests, data.personalization.interests],
  );

  const storiesRoute = `/app/profiles/${encodeURIComponent(childProfileId)}?section=stories`;
  const charactersRoute = `/app/profiles/${encodeURIComponent(childProfileId)}?section=characters`;
  const worldRoute = `/app/profiles/${encodeURIComponent(childProfileId)}/world`;

  return (
    <div className={`lumi-dashboard-v2 ${styles.page}`}>
      <style>{`
        body:has(.lumi-dashboard-v2) { background: #020817; }
        body:has(.lumi-dashboard-v2) > header,
        body:has(.lumi-dashboard-v2) > footer { display: none; }
        body:has(.lumi-dashboard-v2) > main { min-height: 100vh; }
      `}</style>

      <aside className={styles.sidebar}>
        <Link className={styles.logo} href="/app" aria-label="LUMI dashboard">
          LUMI<span>✦</span>
        </Link>

        <nav className={styles.nav} aria-label="Dashboard navigasyonu">
          <SideLink icon="home" label="Dashboard" href="/app" active />
          <SideLink icon="menu_book" label="Hikâyeler" href={storiesRoute} />
          <SideLink icon="group" label="Karakterler" href={charactersRoute} />
          <SideLink icon="public" label="Dünyalar" href={worldRoute} />
          <SideLink icon="image" label="Görsel Kütüphane" href="/app/assets" />
          <SideLink icon="settings" label="Ayarlar" href="/app/settings" />
        </nav>

        <div className={styles.sidebarArt} aria-hidden="true">
          <span className="material-symbols-outlined">camping</span>
        </div>

        <div className={styles.premiumCard}>
          <span className="material-symbols-outlined" aria-hidden="true">
            crown
          </span>
          <strong>LUMI Premium</strong>
          <p>Sınırsız hayal gücü seni bekliyor.</p>
          <button type="button" disabled title="Yakında">
            Planı Yönet
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.searchBox} aria-label="Arama yakında">
            <span className="material-symbols-outlined" aria-hidden="true">
              search
            </span>
            <span>Hikâye, karakter veya dünya ara…</span>
          </div>
          <div className={styles.account}>
            <button type="button" disabled aria-label="Bildirimler yakında">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className={styles.avatar} aria-hidden="true">
              {parentName.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <strong>{parentName}</strong>
              <span>Veli Hesabı</span>
            </div>
          </div>
        </header>

        <section className={styles.heroRow}>
          <div className={styles.welcome}>
            <h1>
              Hoş geldin, yeni
              <br />
              maceralar hazır <span>✦</span>
            </h1>
            <p>Hayal gücü, öğrenmeyi ve keşfetmeyi birlikte büyütür.</p>
          </div>

          <div className={styles.quickGrid}>
            <QuickAction
              icon="star"
              label="Yeni Hikâye Başlat"
              href={storiesRoute}
            />
            <QuickAction
              icon="face_6"
              label="Karakterin"
              detail={loading ? "…" : `${data.characters.length} karakter`}
              href={charactersRoute}
            />
            <QuickAction
              icon="public"
              label="Dünyan"
              detail={worldLabel ?? undefined}
              href={worldRoute}
            />
            <QuickAction
              icon="inventory_2"
              label="Görsel Kütüphane"
              href="/app/assets"
            />
          </div>
        </section>

        <section className={styles.primaryGrid}>
          <article className={styles.continueCard}>
            <div className={styles.cardGlow} aria-hidden="true" />
            <p className={styles.eyebrow}>DEVAM EDEN HİKÂYE</p>
            {loading ? (
              <DashboardSkeleton />
            ) : ongoing ? (
              <>
                <h2>{ongoing.title}</h2>
                <div className={styles.statusLine}>
                  <span /> Macera devam ediyor
                </div>
                <p className={styles.recap}>{ongoing.playerRecap}</p>
                <div className={styles.storyMeta}>
                  {ongoing.currentSceneTitle ? (
                    <span>
                      <span className="material-symbols-outlined">auto_stories</span>
                      {ongoing.currentSceneTitle}
                    </span>
                  ) : null}
                  {worldLabel ? (
                    <span>
                      <span className="material-symbols-outlined">location_on</span>
                      {worldLabel}
                    </span>
                  ) : null}
                </div>
                <Link className={styles.primaryButton} href={storiesRoute}>
                  Devam Et
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
              </>
            ) : (
              <>
                <h2>Yeni bir maceraya hazır mısın?</h2>
                <p className={styles.recap}>
                  Henüz devam eden bir hikâye yok. Dünyanın sunduğu gerçek macera
                  başlangıçlarını keşfedebilirsin.
                </p>
                <Link className={styles.primaryButton} href={storiesRoute}>
                  Yeni Hikâye Başlat
                  <span className="material-symbols-outlined">auto_awesome</span>
                </Link>
              </>
            )}
          </article>

          <article className={styles.childCard}>
            <p className={styles.sectionTitle}>Çocuğum</p>
            <div className={styles.childIdentity}>
              {primaryCharacter ? (
                <CanonicalCharacterImage
                  characterId={primaryCharacter.id}
                  householdId={householdId}
                  characterName={primaryCharacter.name}
                  className={styles.characterImage}
                  sizes="88px"
                  priority
                />
              ) : (
                <div className={styles.characterFallback} aria-hidden="true">
                  <span className="material-symbols-outlined">face_6</span>
                </div>
              )}
              <div>
                <h2>{primaryCharacter?.name ?? childName}</h2>
                <span className={styles.agePill}>{ageBand}</span>
              </div>
            </div>
            <div className={styles.interests}>
              {interests.length > 0 ? (
                interests.map((interest) => <span key={interest}>{interest}</span>)
              ) : (
                <span>İlgi alanları henüz eklenmedi</span>
              )}
            </div>
            <div className={styles.childStats}>
              <Stat label="Hikâyeler" value={String(past.length + (ongoing ? 1 : 0))} />
              <Stat label="Dünya" value={data.world ? "1" : "—"} />
              <Stat label="Başarılar" value="—" />
              <Stat label="Okuma Süresi" value="—" />
            </div>
            <Link className={styles.textLink} href={`/app/profiles/${encodeURIComponent(childProfileId)}`}>
              Çocuğun alanını aç →
            </Link>
          </article>
        </section>

        <section className={styles.secondaryGrid}>
          <div className={styles.adventuresColumn}>
            <div className={styles.sectionHeader}>
              <h2>Son Maceralar</h2>
              <Link href={storiesRoute}>Tüm Hikâyeleri Gör →</Link>
            </div>
            <div className={styles.adventureGrid}>
              {loading ? (
                <DashboardSkeleton compact />
              ) : past.length > 0 ? (
                past.slice(0, 4).map((adventure, index) => (
                  <article className={styles.adventureCard} key={adventure.sessionId}>
                    <div className={`${styles.adventureArt} ${styles[`art${index % 4}`]}`} aria-hidden="true">
                      <span className="material-symbols-outlined">auto_stories</span>
                    </div>
                    <div>
                      <h3>{adventure.title}</h3>
                      <p>{adventure.semanticState === "completed" ? "Tamamlandı" : "Geçmiş macera"}</p>
                    </div>
                  </article>
                ))
              ) : (
                <div className={styles.emptyRow}>
                  İlk maceran burada görünecek. Hikâye dünyan hazır olduğunda yeni bir
                  başlangıç seçebilirsin.
                </div>
              )}
            </div>

            <div className={styles.bottomCards}>
              <article className={styles.worldCard}>
                <div>
                  <p className={styles.sectionTitle}>Dünyaların</p>
                  <h3>{worldLabel ?? "Sihirli Atlas"}</h3>
                  <p>
                    {worldLabel
                      ? "Dünyandaki gerçek konumları ve keşfedilen bölgeleri aç."
                      : "Dünya hazır olduğunda keşfedilen bölgeler burada yer alacak."}
                  </p>
                  <Link className={styles.smallButton} href={worldRoute}>
                    Dünyanı Keşfet
                  </Link>
                </div>
                <div className={styles.mapArt} aria-hidden="true">
                  <span className="material-symbols-outlined">map</span>
                  <i />
                  <b />
                </div>
              </article>

              <article className={styles.achievementCard}>
                <div className={styles.sectionHeader}>
                  <h2>Kazanımların</h2>
                </div>
                <div className={styles.badges}>
                  <Badge icon="explore" label="İlk Keşif" />
                  <Badge icon="menu_book" label="Okuma Kâşifi" />
                  <Badge icon="auto_awesome" label="Hayal Gücü" />
                </div>
                <p className={styles.mutedCopy}>
                  Başarı verileri hazır olduğunda gerçek kazanımlar burada gösterilecek.
                </p>
              </article>
            </div>
          </div>

          <aside className={styles.activityCard}>
            <div className={styles.sectionHeader}>
              <h2>Son Etkinlikler</h2>
            </div>
            {past.slice(0, 3).length > 0 ? (
              <div className={styles.activityList}>
                {past.slice(0, 3).map((adventure) => (
                  <div key={adventure.sessionId}>
                    <span className="material-symbols-outlined">menu_book</span>
                    <p>
                      <strong>{adventure.title}</strong>
                      <small>{adventure.semanticState === "completed" ? "Tamamlanan macera" : "Geçmiş macera"}</small>
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.emptyActivity}>
                Henüz doğrulanmış bir etkinlik akışı yok. LUMI burada gerçekleşmemiş
                olayları uydurmaz.
              </p>
            )}
          </aside>
        </section>

        <section className={styles.newStoryBanner}>
          <div className={styles.owl} aria-hidden="true">✦</div>
          <div>
            <h2>Bugün yeni bir hikâye başlatmaya ne dersin?</h2>
            <p>LUMI, yeni keşifler için burada.</p>
          </div>
          <Link className={styles.primaryButton} href={storiesRoute}>
            <span className="material-symbols-outlined">star</span>
            Yeni Hikâye Başlat
          </Link>
        </section>
      </main>
    </div>
  );
}

function SideLink({
  icon,
  label,
  href,
  active = false,
}: {
  icon: string;
  label: string;
  href: string;
  active?: boolean;
}) {
  return (
    <Link className={`${styles.navLink} ${active ? styles.navActive : ""}`} href={href}>
      <span className="material-symbols-outlined" aria-hidden="true">{icon}</span>
      {label}
    </Link>
  );
}

function QuickAction({
  icon,
  label,
  detail,
  href,
}: {
  icon: string;
  label: string;
  detail?: string;
  href: string;
}) {
  return (
    <Link className={styles.quickCard} href={href}>
      <span className={`material-symbols-outlined ${styles.quickIcon}`} aria-hidden="true">{icon}</span>
      <strong>{label}</strong>
      {detail ? <small>{detail}</small> : null}
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Badge({ icon, label }: { icon: string; label: string }) {
  return (
    <div>
      <span className="material-symbols-outlined" aria-hidden="true">{icon}</span>
      <small>{label}</small>
    </div>
  );
}

function DashboardSkeleton({ compact = false }: { compact?: boolean }) {
  return <div className={`${styles.skeleton} ${compact ? styles.skeletonCompact : ""}`} aria-label="Dashboard yükleniyor" />;
}
