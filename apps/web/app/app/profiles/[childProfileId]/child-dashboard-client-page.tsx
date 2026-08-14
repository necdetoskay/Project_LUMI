"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { CanonicalCharacterImage } from "@/components/assets/canonical-character-image";
import { ProfileStoriesSection } from "@/components/story/profile-stories-section";

type Profile = {
  id: string;
  householdId: string;
  displayName: string;
  ageBand: string;
  locale: string;
};

type CharacterInfo = {
  id: string;
  name: string;
  broadKind: string;
  characterType: string;
  subtype: string;
  createdAt: string;
};

type Personalization = {
  interests?: string[];
  customInterests?: string[];
};

type AdventureHighlight = {
  kind: "location" | "item" | "companion" | "clue";
  label: string;
};

type AdventureSummary = {
  sessionId: string;
  title: string;
  semanticState: "ongoing" | "completed" | "archived";
  playerRecap: string;
  currentSceneTitle: string | null;
  highlights: AdventureHighlight[];
};

type StorySource = {
  id: string;
  kind: string;
  title: string;
  summary: string;
};

type StoriesResponse = {
  launchOptions?: Array<{
    character: CharacterInfo;
    world: { id: string; label: string } | null;
    currentLocation: { id: string; displayName: string } | null;
    storySources: StorySource[];
  }>;
  adventureHub?: {
    ongoingAdventure: AdventureSummary | null;
    pastAdventures: AdventureSummary[];
  };
};

type WorldResponse = {
  world?: {
    id: string;
    currentLocation: {
      id: string;
      displayName: string;
      locationType: string;
    } | null;
    regions: Array<{
      id: string;
      displayName: string;
      isCurrentRegion: boolean;
    }>;
  } | null;
};

type InventoryItem = {
  id: string;
  displayName: string;
  category: string;
  quantity: number;
};

type View = "home" | "characters" | "stories" | "bag";

type DashboardState = {
  profile: Profile | null;
  householdId: string | null;
  characters: CharacterInfo[];
  personalization: Personalization;
  stories: StoriesResponse | null;
  world: WorldResponse["world"];
  inventory: InventoryItem[];
};

const EMPTY_STATE: DashboardState = {
  profile: null,
  householdId: null,
  characters: [],
  personalization: {},
  stories: null,
  world: null,
  inventory: [],
};

export default function ChildDashboardClientPage({
  childProfileId,
}: {
  childProfileId: string;
}) {
  const [data, setData] = useState<DashboardState>(EMPTY_STATE);
  const [view, setView] = useState<View>("home");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const section = new URLSearchParams(window.location.search).get("section");
    if (section && ["home", "characters", "stories", "bag"].includes(section)) {
      setView(section as View);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const onboardingResponse = await fetch("/api/onboarding", {
          signal: controller.signal,
        });
        const onboardingBody = (await onboardingResponse.json()) as {
          onboarding?: { hasHousehold: boolean; householdId: string | null };
        };
        const householdId = onboardingBody.onboarding?.householdId ?? null;
        if (!householdId) {
          setError("Aile alanı bulunamadı.");
          return;
        }

        const query = `householdId=${encodeURIComponent(householdId)}`;
        const [profileResponse, charactersResponse, personalizationResponse, storiesResponse, worldResponse] =
          await Promise.all([
            fetch(`/api/child-profiles/${encodeURIComponent(childProfileId)}?${query}`, {
              signal: controller.signal,
            }),
            fetch(
              `/api/characters?${query}&childProfileId=${encodeURIComponent(childProfileId)}`,
              { signal: controller.signal },
            ),
            fetch(
              `/api/child-profiles/${encodeURIComponent(childProfileId)}/personalization?${query}`,
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
          ]);

        if (!profileResponse.ok) {
          setError("Çocuk profili yüklenemedi.");
          return;
        }

        const profileBody = (await profileResponse.json()) as { profile: Profile };
        const charactersBody = charactersResponse.ok
          ? ((await charactersResponse.json()) as { characters?: CharacterInfo[] })
          : { characters: [] };
        const personalizationBody = personalizationResponse.ok
          ? ((await personalizationResponse.json()) as {
              personalization?: Personalization;
            })
          : { personalization: {} };
        const storiesBody = storiesResponse.ok
          ? ((await storiesResponse.json()) as StoriesResponse)
          : null;
        const worldBody = worldResponse.ok
          ? ((await worldResponse.json()) as WorldResponse)
          : { world: null };
        const characters = charactersBody.characters ?? [];
        const primaryCharacter = characters[0] ?? null;

        let inventory: InventoryItem[] = [];
        if (primaryCharacter) {
          const inventoryResponse = await fetch(
            `/api/inventory/list?${query}&ownerType=character&ownerId=${encodeURIComponent(primaryCharacter.id)}`,
            { signal: controller.signal },
          );
          if (inventoryResponse.ok) {
            const inventoryBody = (await inventoryResponse.json()) as {
              items?: InventoryItem[];
            };
            inventory = inventoryBody.items ?? [];
          }
        }

        if (!controller.signal.aborted) {
          setData({
            profile: profileBody.profile,
            householdId,
            characters,
            personalization: personalizationBody.personalization ?? {},
            stories: storiesBody,
            world: worldBody.world ?? null,
            inventory,
          });
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(
            loadError instanceof Error && loadError.name === "AbortError"
              ? null
              : "LUMI alanı yüklenirken bir sorun oluştu.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [childProfileId]);

  const primaryCharacter = data.characters[0] ?? null;
  const ongoingAdventure = data.stories?.adventureHub?.ongoingAdventure ?? null;
  const pastAdventures = data.stories?.adventureHub?.pastAdventures ?? [];
  const launch = data.stories?.launchOptions?.[0] ?? null;
  const suggestions = useMemo(
    () => (launch?.storySources ?? []).slice(0, 3),
    [launch?.storySources],
  );
  const currentRegion = data.world?.regions.find((region) => region.isCurrentRegion) ?? null;
  const worldLabel =
    data.world?.currentLocation?.displayName ??
    currentRegion?.displayName ??
    launch?.world?.label ??
    null;
  const interestCount =
    (data.personalization.interests?.length ?? 0) +
    (data.personalization.customInterests?.length ?? 0);

  if (loading) {
    return <StateScreen icon="auto_awesome" text="LUMI alanı hazırlanıyor…" />;
  }

  if (error || !data.profile) {
    return <StateScreen icon="error" text={error ?? "Profil bulunamadı."} />;
  }

  return (
    <main className="min-h-screen bg-[#f8f4ea] text-[#34281f]">
      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[190px_minmax(0,1fr)]">
        <aside className="border-b border-[#e8dcc8] bg-[#fffaf0] px-4 py-5 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:px-5 lg:py-7">
          <div className="flex items-center justify-between lg:block">
            <Link href="/app/profiles" className="text-3xl font-black tracking-[0.14em] text-[#1f7a70]">
              LUMI
            </Link>
            <Link
              href="/app/profiles"
              className="rounded-full border border-[#e0d4c1] bg-white px-3 py-2 text-xs font-bold lg:hidden"
            >
              Çocuklarım
            </Link>
          </div>

          <nav className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:mt-10 lg:flex-col lg:overflow-visible">
            <NavButton icon="home" label="Ana Sayfa" active={view === "home"} onClick={() => setView("home")} />
            <NavButton icon="face_6" label="Karakterler" active={view === "characters"} onClick={() => setView("characters")} />
            <NavButton icon="auto_stories" label="Hikâyeler" active={view === "stories"} onClick={() => setView("stories")} />
            <NavButton icon="backpack" label="Çanta" active={view === "bag"} onClick={() => setView("bag")} />
            <Link
              href={`/app/profiles/${encodeURIComponent(childProfileId)}/world`}
              className="flex min-w-max items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-[#5d5147] transition hover:bg-[#edf5ef] lg:w-full"
            >
              <span className="material-symbols-outlined text-[21px]">map</span>
              Harita
            </Link>
          </nav>

          <div className="mt-8 hidden rounded-[28px] bg-[linear-gradient(160deg,#edf5ea,#fff5dc)] p-5 text-sm text-[#65584d] lg:block">
            <span className="material-symbols-outlined text-3xl text-[#c2862b]">camping</span>
            <p className="mt-3 font-bold text-[#3b3028]">Yaşayan bir dünya</p>
            <p className="mt-1 leading-6">Yeni izler, hikâyeler ve keşifler burada birikir.</p>
          </div>
        </aside>

        <div className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-7 xl:px-10">
          <header className="rounded-[30px] border border-[#eadfce] bg-[#fffdf7] p-5 shadow-[0_10px_30px_rgba(90,68,42,0.06)] md:p-7">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 items-center gap-4 sm:gap-5">
                {primaryCharacter ? (
                  <CanonicalCharacterImage
                    characterId={primaryCharacter.id}
                    householdId={data.householdId}
                    characterName={primaryCharacter.name}
                    className="h-20 w-20 shrink-0 rounded-full border-4 border-white shadow-md sm:h-24 sm:w-24"
                    sizes="96px"
                    priority
                  />
                ) : (
                  <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-[#f0eadf] text-4xl sm:h-24 sm:w-24">🌱</div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#1f7a70]">Çocuğun LUMI alanı</p>
                  <h1 className="mt-1 truncate text-3xl font-black tracking-tight sm:text-4xl">
                    Merhaba, {primaryCharacter?.name ?? data.profile.displayName} ✨
                  </h1>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <InfoPill icon="cake" text={ageLabel(data.profile.ageBand)} />
                    {worldLabel ? <InfoPill icon="forest" text={worldLabel} /> : null}
                    <InfoPill icon="favorite" text={`${interestCount} ilgi alanı`} />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/app/profiles/${encodeURIComponent(childProfileId)}/world`}
                  className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#16786f] px-5 font-extrabold text-white shadow-sm transition hover:-translate-y-0.5"
                >
                  <span className="material-symbols-outlined">explore</span>
                  Dünyasına Git
                </Link>
                <Link
                  href={`/app/profiles/${encodeURIComponent(childProfileId)}?manage=1&tab=personalization`}
                  className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#dfd2be] bg-white px-5 font-bold text-[#51463d]"
                >
                  <span className="material-symbols-outlined">settings</span>
                  Profil Ayarları
                </Link>
              </div>
            </div>
          </header>

          {view === "home" ? (
            <HomeView
              childProfileId={childProfileId}
              householdId={data.householdId}
              primaryCharacter={primaryCharacter}
              ongoingAdventure={ongoingAdventure}
              pastAdventures={pastAdventures}
              suggestions={suggestions}
              inventory={data.inventory}
              currentLocation={data.world?.currentLocation?.displayName ?? null}
              onOpenCharacters={() => setView("characters")}
              onOpenStories={() => setView("stories")}
              onOpenBag={() => setView("bag")}
            />
          ) : null}

          {view === "characters" ? (
            <CharactersView
              childProfileId={childProfileId}
              householdId={data.householdId}
              characters={data.characters}
            />
          ) : null}

          {view === "stories" ? (
            <section className="mt-6 rounded-[28px] border border-[#eadfce] bg-white p-4 shadow-sm sm:p-6">
              <ProfileStoriesSection childProfileId={childProfileId} />
            </section>
          ) : null}

          {view === "bag" ? <BagView inventory={data.inventory} /> : null}
        </div>
      </div>
    </main>
  );
}

function HomeView({
  childProfileId,
  householdId,
  primaryCharacter,
  ongoingAdventure,
  pastAdventures,
  suggestions,
  inventory,
  currentLocation,
  onOpenCharacters,
  onOpenStories,
  onOpenBag,
}: {
  childProfileId: string;
  householdId: string | null;
  primaryCharacter: CharacterInfo | null;
  ongoingAdventure: AdventureSummary | null;
  pastAdventures: AdventureSummary[];
  suggestions: StorySource[];
  inventory: InventoryItem[];
  currentLocation: string | null;
  onOpenCharacters: () => void;
  onOpenStories: () => void;
  onOpenBag: () => void;
}) {
  const meaningfulItem = inventory[0] ?? null;

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.9fr)]">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[30px] border border-[#d9ddd0] bg-[linear-gradient(135deg,#f4fbf5,#fffaf0)] shadow-[0_12px_28px_rgba(53,73,56,0.08)]">
          <div className="inline-flex items-center gap-2 rounded-br-3xl bg-[#197d73] px-5 py-3 font-black text-white">
            <span className="material-symbols-outlined">menu_book</span>
            Devam Eden Macera
          </div>
          {ongoingAdventure && primaryCharacter ? (
            <div className="grid gap-5 p-5 md:grid-cols-[minmax(250px,0.95fr)_minmax(0,1fr)] md:p-6">
              <CanonicalCharacterImage
                characterId={primaryCharacter.id}
                householdId={householdId}
                characterName={primaryCharacter.name}
                variant="body-three-quarter"
                className="min-h-[290px] rounded-[24px] border border-white/80 shadow-sm"
                sizes="(min-width: 768px) 40vw, 100vw"
              />
              <div className="flex flex-col justify-center">
                <h2 className="text-3xl font-black leading-tight">{ongoingAdventure.title}</h2>
                <p className="mt-4 line-clamp-5 text-[15px] leading-7 text-[#65584d]">
                  {ongoingAdventure.playerRecap}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {currentLocation ? <StoryChip icon="location_on" text={`En son: ${currentLocation}`} /> : null}
                  {meaningfulItem ? <StoryChip icon="backpack" text={`Yanında: ${meaningfulItem.displayName}`} warm /> : null}
                </div>
                <button
                  type="button"
                  onClick={onOpenStories}
                  className="mt-6 inline-flex h-12 w-fit items-center gap-2 rounded-2xl bg-[#16786f] px-6 text-base font-black text-white shadow-sm"
                >
                  <span className="material-symbols-outlined">play_arrow</span>
                  Maceraya Devam Et
                </button>
              </div>
            </div>
          ) : (
            <div className="p-7 sm:p-9">
              <h2 className="text-2xl font-black">Yeni bir maceraya hazır mısın?</h2>
              <p className="mt-2 max-w-xl leading-7 text-[#6b5e53]">
                Henüz devam eden bir macera yok. Dünya hazır olduğunda ilk hikâyeni buradan başlatabilirsin.
              </p>
              <button type="button" onClick={onOpenStories} className="mt-5 rounded-2xl bg-[#16786f] px-5 py-3 font-black text-white">
                Hikâyelere Git
              </button>
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-[#eadfce] bg-[#fffdf9] p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[#39806f]">Karakterler</p>
              <h2 className="mt-1 text-2xl font-black">Macera arkadaşların</h2>
            </div>
            <button type="button" onClick={onOpenCharacters} className="rounded-2xl bg-[#6c42df] px-4 py-3 text-sm font-black text-white">
              + Yeni Karakter Oluştur
            </button>
          </div>
          {primaryCharacter ? (
            <button type="button" onClick={onOpenCharacters} className="mt-5 grid w-full overflow-hidden rounded-[22px] border border-[#dfd5ee] bg-white text-left sm:max-w-xl sm:grid-cols-[180px_1fr]">
              <CanonicalCharacterImage
                characterId={primaryCharacter.id}
                householdId={householdId}
                characterName={primaryCharacter.name}
                className="h-40 sm:h-full"
                sizes="180px"
              />
              <div className="p-5">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#6c42df]">{primaryCharacter.characterType}</p>
                <h3 className="mt-1 text-2xl font-black">{primaryCharacter.name}</h3>
                <p className="mt-2 text-sm leading-6 text-[#6b5f55]">{primaryCharacter.subtype || primaryCharacter.broadKind}</p>
              </div>
            </button>
          ) : (
            <div className="mt-5 rounded-[22px] border border-dashed border-[#d9ccba] bg-[#fffaf1] p-7 text-center">
              <p className="font-bold">Henüz karakter yok.</p>
              <button type="button" onClick={onOpenCharacters} className="mt-3 text-sm font-black text-[#6c42df]">İlk karakterini oluştur →</button>
            </div>
          )}
        </section>

        {pastAdventures.length > 0 ? (
          <section className="rounded-[28px] border border-[#eadfce] bg-[#fffdf9] p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-black">Geçmiş Maceralar</h2>
              <button type="button" onClick={onOpenStories} className="text-sm font-black text-[#6c42df]">Tümünü Gör →</button>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {pastAdventures.slice(0, 3).map((adventure) => (
                <article key={adventure.sessionId} className="overflow-hidden rounded-[22px] border border-[#eadfce] bg-white">
                  <div className="grid h-28 place-items-center bg-[linear-gradient(135deg,#dceee6,#f7e8c8)] text-4xl">✨</div>
                  <div className="p-4">
                    <h3 className="font-black leading-5">{adventure.title}</h3>
                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-[#6f6258]">{adventure.playerRecap}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <div className="space-y-6">
        <section className="rounded-[30px] border border-[#eadfce] bg-[#fffdf8] p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <h2 className="text-2xl font-black">Bugünkü Macera Önerileri</h2>
          </div>
          {suggestions.length > 0 ? (
            <div className="mt-5 space-y-4">
              {suggestions.map((source) => (
                <SuggestionCard key={source.id} source={source} onClick={onOpenStories} />
              ))}
              <button type="button" onClick={onOpenStories} className="w-full rounded-2xl border border-[#dfd3c1] bg-white px-4 py-3 text-sm font-black">
                ✨ Başka maceralar göster
              </button>
            </div>
          ) : (
            <div className="mt-5 rounded-[22px] border border-dashed border-[#ddd0bd] bg-[#fffaf1] p-6 text-sm leading-6 text-[#6d6056]">
              Dünya biraz sessiz görünüyor. Yeni bir macera fikri için Hikâyeler bölümüne geçebilirsin.
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-[#eadfce] bg-[#fffdf9] p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">🎒 Çanta Özeti</h2>
            <button type="button" onClick={onOpenBag} className="text-sm font-black text-[#6c42df]">Çantama Git →</button>
          </div>
          {inventory.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
              {inventory.slice(0, 3).map((item) => (
                <article key={item.id} className="rounded-[20px] border border-[#eadfce] bg-white p-4">
                  <div className="text-2xl">{itemEmoji(item.category)}</div>
                  <h3 className="mt-2 font-black">{item.displayName}</h3>
                  <p className="mt-1 text-xs text-[#76695e]">Adet: {item.quantity}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-2xl bg-[#fffaf1] p-4 text-sm text-[#70645a]">Çantada henüz gösterilecek bir eşya yok.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function CharactersView({ childProfileId, householdId, characters }: { childProfileId: string; householdId: string | null; characters: CharacterInfo[] }) {
  return (
    <section className="mt-6 rounded-[30px] border border-[#eadfce] bg-[#fffdf9] p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[#39806f]">Karakterler</p>
          <h2 className="mt-1 text-3xl font-black">Macera arkadaşlarını yönet</h2>
        </div>
        <Link href={`/app/character-onboarding?childProfileId=${encodeURIComponent(childProfileId)}`} className="rounded-2xl bg-[#6c42df] px-5 py-3 font-black text-white">
          + Yeni Karakter Oluştur
        </Link>
      </div>

      {characters.length > 0 ? (
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {characters.map((character) => (
            <article key={character.id} className="overflow-hidden rounded-[24px] border border-[#e1d7c7] bg-white shadow-sm">
              <CanonicalCharacterImage characterId={character.id} householdId={householdId} characterName={character.name} className="h-52" sizes="(min-width: 1280px) 28vw, 50vw" />
              <div className="p-5">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#6c42df]">{character.characterType}</p>
                <h3 className="mt-1 text-2xl font-black">{character.name}</h3>
                <p className="mt-2 text-sm text-[#6e6157]">{character.subtype || character.broadKind}</p>
                <p className="mt-4 text-xs leading-5 text-[#8a7c70]">Arşivleme/silme aksiyonu soft-delete PR’ı yeni shell’e taşındığında bu kartın sağ üstüne bağlanacak.</p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-7 rounded-[24px] border border-dashed border-[#ddcfbc] bg-[#fff9ee] p-10 text-center">
          <span className="text-5xl">🌱</span>
          <h3 className="mt-4 text-xl font-black">İlk karakterini oluştur</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#71645a]">Dünya ve hikâye yolculuğu karakterinle başlayacak.</p>
        </div>
      )}
    </section>
  );
}

function BagView({ inventory }: { inventory: InventoryItem[] }) {
  return (
    <section className="mt-6 rounded-[30px] border border-[#eadfce] bg-[#fffdf9] p-5 shadow-sm sm:p-7">
      <p className="text-sm font-bold text-[#39806f]">Çanta</p>
      <h2 className="mt-1 text-3xl font-black">Yanındaki eşyalar</h2>
      {inventory.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {inventory.map((item) => (
            <article key={item.id} className="rounded-[22px] border border-[#eadfce] bg-white p-5">
              <div className="text-4xl">{itemEmoji(item.category)}</div>
              <h3 className="mt-3 text-lg font-black">{item.displayName}</h3>
              <p className="mt-1 text-sm text-[#74675d]">{item.category} · {item.quantity} adet</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-[22px] border border-dashed border-[#ddcfbc] bg-[#fff9ee] p-8 text-center text-[#70645a]">Çanta henüz boş.</div>
      )}
    </section>
  );
}

function SuggestionCard({ source, onClick }: { source: StorySource; onClick: () => void }) {
  const presentation = suggestionPresentation(source.kind);
  return (
    <article className={`rounded-[22px] border p-4 ${presentation.surface}`}>
      <div className="flex gap-4">
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-[18px] bg-white/80 text-3xl shadow-sm">{presentation.emoji}</div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-black ${presentation.text}`}>{presentation.label}</p>
          <h3 className="mt-1 font-black leading-5">{source.title}</h3>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#6e6157]">{source.summary}</p>
          <button type="button" onClick={onClick} className={`mt-3 rounded-xl px-3 py-2 text-xs font-black text-white ${presentation.button}`}>
            {presentation.cta}
          </button>
        </div>
      </div>
    </article>
  );
}

function NavButton({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`flex min-w-max items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition lg:w-full ${active ? "border border-[#cfdccb] bg-[#edf5ef] text-[#176f66]" : "text-[#5d5147] hover:bg-[#f5eee3]"}`}>
      <span className="material-symbols-outlined text-[21px]">{icon}</span>
      {label}
    </button>
  );
}

function InfoPill({ icon, text }: { icon: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e8ddcb] bg-white px-3 py-1.5 text-xs font-bold text-[#5e5248]">
      <span className="material-symbols-outlined text-[16px] text-[#6c42df]">{icon}</span>
      {text}
    </span>
  );
}

function StoryChip({ icon, text, warm = false }: { icon: string; text: string; warm?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold ${warm ? "border-[#ead2a1] bg-[#fff3cf]" : "border-[#c9ded5] bg-[#eef8f3]"}`}>
      <span className="material-symbols-outlined text-[16px]">{icon}</span>
      {text}
    </span>
  );
}

function StateScreen({ icon, text }: { icon: string; text: string }) {
  return (
    <main className="grid min-h-[70vh] place-items-center bg-[#f8f4ea] p-6">
      <div className="rounded-[28px] border border-[#eadfce] bg-white px-8 py-10 text-center shadow-sm">
        <span className="material-symbols-outlined text-4xl text-[#1f7a70]">{icon}</span>
        <p className="mt-4 font-bold text-[#62564c]">{text}</p>
      </div>
    </main>
  );
}

function suggestionPresentation(kind: string) {
  if (kind === "inventory") {
    return { label: "Çantandaki Bir Eşya", emoji: "🎒", cta: "Eşyayı takip et", surface: "border-[#ead7aa] bg-[#fff9e9]", text: "text-[#9a651d]", button: "bg-[#d99725]" };
  }
  if (kind === "origin") {
    return { label: "Eski Bir İz", emoji: "🧭", cta: "İzin peşine düş", surface: "border-[#d9cce8] bg-[#faf5ff]", text: "text-[#6d4a97]", button: "bg-[#8a67b3]" };
  }
  return { label: "Dünyada Bir Şey Oldu", emoji: "🌍", cta: "Bu macerayı seç", surface: "border-[#c9ded5] bg-[#f2faf6]", text: "text-[#176f66]", button: "bg-[#1c8277]" };
}

function itemEmoji(category: string) {
  const normalized = category.toLocaleLowerCase("tr-TR");
  if (normalized.includes("compass") || normalized.includes("pusula")) return "🧭";
  if (normalized.includes("light") || normalized.includes("fener")) return "🏮";
  if (normalized.includes("leaf") || normalized.includes("yaprak")) return "🍃";
  if (normalized.includes("book") || normalized.includes("kitap")) return "📖";
  return "🎒";
}

function ageLabel(value: string) {
  return value.includes("yaş") ? value : `${value} yaş`;
}
