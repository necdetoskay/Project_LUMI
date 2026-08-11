"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CanonicalCharacterImage } from "@/components/assets/canonical-character-image";
import { CanonicalBagImage } from "@/components/assets/canonical-bag-image";
import { CanonicalItemImage } from "@/components/assets/canonical-item-image";

type CharacterResponse = {
  character?: {
    id: string;
    childProfileId: string;
    householdId: string;
    name: string;
    originConcept: string | null;
    startingLocation: string | null;
    homeArchetype: string | null;
    createdAt: string;
  } | null;
  message?: string;
};

type InventoryItem = {
  id: string;
  itemDefinitionId: string;
  displayName: string;
  quantity: number;
  conditionStatus: string;
};

type OnboardingPayload = {
  onboarding?: {
    householdId: string | null;
  };
};

type WorldResponse = {
  world?: {
    currentLocation: {
      id: string;
      displayName: string;
      locationType: string;
    } | null;
    regions: Array<{
      id: string;
      displayName: string;
      isCurrentRegion: boolean;
      locations: Array<{
        id: string;
        displayName: string;
        isCurrent: boolean;
      }>;
    }>;
  } | null;
};

export function ProfileCharacterDetailSection({
  childProfileId,
  characterId,
}: {
  childProfileId: string;
  characterId: string;
}) {
  const [character, setCharacter] =
    useState<CharacterResponse["character"]>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [world, setWorld] = useState<WorldResponse["world"]>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const onboardingRes = await fetch("/api/onboarding");
      const onboardingData = (await onboardingRes.json()) as OnboardingPayload;
      const householdId = onboardingData.onboarding?.householdId ?? null;

      if (!householdId) {
        setError("Aile bilgisi bulunamadı.");
        setCharacter(null);
        setInventory([]);
        setWorld(null);
        return;
      }

      setHouseholdId(householdId);

      const characterRes = await fetch(
        `/api/characters/${encodeURIComponent(characterId)}?householdId=${encodeURIComponent(householdId)}`,
      );
      const characterBody = (await characterRes.json()) as CharacterResponse;

      if (!characterRes.ok || !characterBody.character) {
        setError(characterBody.message ?? "Karakter bilgisi yüklenemedi.");
        setCharacter(null);
        setInventory([]);
        setWorld(null);
        return;
      }

      setCharacter(characterBody.character);

      const [inventoryResult, worldResult] = await Promise.allSettled([
        fetch(
          `/api/inventory/list?householdId=${encodeURIComponent(householdId)}&ownerType=character&ownerId=${encodeURIComponent(characterId)}`,
        ),
        fetch(
          `/api/child-profiles/${encodeURIComponent(childProfileId)}/world?householdId=${encodeURIComponent(householdId)}&characterId=${encodeURIComponent(characterId)}`,
        ),
      ]);

      if (inventoryResult.status === "fulfilled" && inventoryResult.value.ok) {
        const inventoryBody = (await inventoryResult.value.json()) as {
          items?: InventoryItem[];
        };
        setInventory(inventoryBody.items ?? []);
      } else {
        setInventory([]);
      }

      if (worldResult.status === "fulfilled" && worldResult.value.ok) {
        const worldBody = (await worldResult.value.json()) as WorldResponse;
        setWorld(worldBody.world ?? null);
      } else {
        setWorld(null);
      }
    } catch {
      setError("Karakterin dünyası şu anda yüklenemedi.");
      setCharacter(null);
      setInventory([]);
      setWorld(null);
    } finally {
      setLoading(false);
    }
  }, [characterId, childProfileId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const currentRegion = useMemo(
    () => world?.regions.find((region) => region.isCurrentRegion) ?? null,
    [world],
  );

  if (loading) {
    return (
      <StateSurface
        icon="auto_awesome"
        title="Şimdiye dönüyoruz…"
        message="Karakterin son bilinen yeri ve yanında olanlar hazırlanıyor."
      />
    );
  }

  if (error || !character) {
    return (
      <StateSurface
        icon="error"
        title="Bu sayfa açılamadı"
        message={error ?? "Karakter bulunamadı."}
      />
    );
  }

  const currentLocation = world?.currentLocation?.displayName ?? null;
  const fallbackLocation =
    character.startingLocation ?? character.homeArchetype;
  const locationTitle =
    currentLocation ?? fallbackLocation ?? "Henüz bilinmiyor";
  const hasCanonicalCurrentLocation = Boolean(currentLocation);

  return (
    <main className="storybook-page min-h-full">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-4 py-6 sm:px-6 md:py-9">
        <nav
          className="flex flex-wrap items-center gap-2 text-sm font-semibold text-on-surface-variant"
          aria-label="Karakter yolu"
        >
          <Link href="/app" className="hover:text-primary">
            Ailem
          </Link>
          <span
            className="material-symbols-outlined text-base"
            aria-hidden="true"
          >
            chevron_right
          </span>
          <Link href="/app/profiles" className="hover:text-primary">
            Çocuklar
          </Link>
          <span
            className="material-symbols-outlined text-base"
            aria-hidden="true"
          >
            chevron_right
          </span>
          <Link
            href={`/app/profiles/${encodeURIComponent(childProfileId)}`}
            className="hover:text-primary"
          >
            Profil
          </Link>
          <span
            className="material-symbols-outlined text-base"
            aria-hidden="true"
          >
            chevron_right
          </span>
          <span className="text-on-surface">{character.name}</span>
        </nav>

        <section className="overflow-hidden rounded-[2.2rem] border border-outline-variant/70 bg-white/80 shadow-sm backdrop-blur">
          <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
            <div className="p-7 md:p-10">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
                Şimdi
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-on-surface md:text-6xl">
                {character.name}
              </h1>
              <p className="mt-4 max-w-[42rem] text-base leading-7 text-on-surface-variant md:text-lg">
                {hasCanonicalCurrentLocation
                  ? `${character.name} şu anda ${locationTitle} konumunda. Bu sayfa yalnızca dünyada gerçekten kayıtlı olan güncel durumu gösterir.`
                  : `Şu anki konum henüz kaydedilmemiş. Bildiğimiz en son başlangıç/yuvaya ait yer ${locationTitle}. Yeni bir sahne olmuş gibi varsaymıyoruz.`}
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  className="storybook-button"
                  href={`/app/profiles/${encodeURIComponent(childProfileId)}?tab=stories`}
                >
                  <span
                    className="material-symbols-outlined"
                    aria-hidden="true"
                  >
                    menu_book
                  </span>
                  Hikâyelere git
                </Link>
                <Link
                  className="storybook-button-secondary"
                  href={`/app/profiles/${encodeURIComponent(childProfileId)}/world?characterId=${encodeURIComponent(characterId)}`}
                >
                  <span
                    className="material-symbols-outlined"
                    aria-hidden="true"
                  >
                    map
                  </span>
                  Dünyamı aç
                </Link>
              </div>
            </div>

            <div className="relative min-h-[360px] overflow-hidden">
              <CanonicalCharacterImage
                characterId={characterId}
                characterName={character.name}
                className="absolute inset-0"
                householdId={householdId}
                priority
                variant="head-three-quarter"
              />
              <div className="absolute inset-x-5 bottom-5 z-10 rounded-[1.4rem] border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur-md">
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-on-surface-variant">
                  {hasCanonicalCurrentLocation
                    ? "Bulunduğun yer"
                    : "Son bildiğimiz yer"}
                </p>
                <h2 className="mt-1 text-2xl font-extrabold text-on-surface">
                  {locationTitle}
                </h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {currentRegion?.displayName
                    ? `${currentRegion.displayName} içinde görünüyor.`
                    : hasCanonicalCurrentLocation
                      ? "Kanonik dünya konumundan gösteriliyor."
                      : "Yeni bir konum uydurulmadı."}
                </p>
              </div>
            </div>
          </div>
        </section>

        <CurrentLifeNavigation
          childProfileId={childProfileId}
          characterId={characterId}
        />

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
          <div className="space-y-6">
            <StoryPanel
              eyebrow="Yanında"
              title="Yolculukta seninle olanlar"
              description="Burada yalnızca karaktere gerçekten bağlı görünen eşyaları gösteriyoruz."
            >
              <div className="relative mb-5 min-h-52 overflow-hidden rounded-[1.6rem] border border-outline-variant/60 bg-surface-container-low sm:min-h-64">
                <CanonicalBagImage
                  characterId={characterId}
                  characterName={character.name}
                  className="absolute inset-0"
                  householdId={householdId}
                  variant="bag-open"
                />
              </div>
              {inventory.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {inventory.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-outline-variant/70 bg-surface-container-low/70 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <CanonicalItemImage
                          className="h-16 w-16 shrink-0 rounded-xl border border-outline-variant/60"
                          householdId={householdId}
                          itemId={item.id}
                          itemName={item.displayName}
                        />
                        <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
                          <div>
                            <p className="font-bold text-on-surface">
                              {item.displayName}
                            </p>
                            <p className="mt-1 text-sm text-on-surface-variant">
                              {conditionSentence(item.conditionStatus)}
                            </p>
                          </div>
                          {item.quantity > 1 ? (
                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-on-surface-variant">
                              {item.quantity} tane
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <TruthfulEmptyState message="Şu anda yanında kayıtlı bir eşya görünmüyor." />
              )}
            </StoryPanel>

            <StoryPanel
              eyebrow="Geçmişinden"
              title="Buraya nasıl geldin?"
              description="Karakterin ilk oluşumunda kanona giren başlangıç bilgileri burada sade bir hatırlatma olarak kalır."
            >
              {character.originConcept ? (
                <p className="text-base leading-7 text-on-surface">
                  {character.originConcept}
                </p>
              ) : (
                <TruthfulEmptyState message="Başlangıç hikâyesine ait bir özet henüz kayıtlı değil." />
              )}
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <QuietFact
                  label="İlk bilinen yer"
                  value={character.startingLocation ?? "Henüz kayıtlı değil"}
                />
                <QuietFact
                  label="Yuva"
                  value={character.homeArchetype ?? "Henüz kayıtlı değil"}
                />
              </div>
            </StoryPanel>
          </div>

          <aside className="space-y-6">
            <StoryPanel
              eyebrow="Devam et"
              title="Bugün nereye bakalım?"
              description="Bir geçmiş hikâyeyi açmak yalnızca okumadır; bu sayfa kendi başına dünya durumunu değiştirmez."
            >
              <div className="space-y-3">
                <ContinuationLink
                  href={`/app/profiles/${encodeURIComponent(childProfileId)}?tab=stories`}
                  icon="auto_stories"
                  title="Hikâyelerim"
                  description="Devam eden ve geçmiş hikâyeleri aç."
                />
                <ContinuationLink
                  href={`/app/profiles/${encodeURIComponent(childProfileId)}/world?characterId=${encodeURIComponent(characterId)}`}
                  icon="travel_explore"
                  title="Dünyam"
                  description="Bilinen bölgeleri ve konumu incele."
                />
                <ContinuationLink
                  href={`/app/profiles/${encodeURIComponent(childProfileId)}`}
                  icon="face"
                  title="Profil"
                  description="İlgi alanları ve ebeveyn ayarlarına dön."
                />
              </div>
            </StoryPanel>
          </aside>
        </section>
      </div>
    </main>
  );
}

function CurrentLifeNavigation({
  childProfileId,
  characterId,
}: {
  childProfileId: string;
  characterId: string;
}) {
  return (
    <nav
      className="flex gap-2 overflow-x-auto rounded-2xl border border-outline-variant/60 bg-white/75 p-2 shadow-sm"
      aria-label="Çocuk deneyimi"
    >
      <span className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary">
        Şimdi
      </span>
      <Link
        className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
        href={`/app/profiles/${encodeURIComponent(childProfileId)}?tab=stories`}
      >
        Hikâyeler
      </Link>
      <Link
        className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
        href={`/app/profiles/${encodeURIComponent(childProfileId)}/world?characterId=${encodeURIComponent(characterId)}`}
      >
        Dünyam
      </Link>
      <Link
        className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
        href={`/app/profiles/${encodeURIComponent(childProfileId)}`}
      >
        Profil
      </Link>
    </nav>
  );
}

function StoryPanel({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.8rem] border border-outline-variant/70 bg-white/85 p-6 shadow-sm md:p-7">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-extrabold text-on-surface">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-on-surface-variant">
        {description}
      </p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function QuietFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-container-low/70 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-on-surface-variant">
        {label}
      </p>
      <p className="mt-2 font-semibold leading-6 text-on-surface">{value}</p>
    </div>
  );
}

function ContinuationLink({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-2xl border border-outline-variant/70 bg-surface-container-low/60 p-4 transition hover:-translate-y-0.5 hover:bg-surface-container-low"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-primary">
        <span className="material-symbols-outlined" aria-hidden="true">
          {icon}
        </span>
      </span>
      <span>
        <span className="block font-bold text-on-surface">{title}</span>
        <span className="mt-1 block text-sm leading-5 text-on-surface-variant">
          {description}
        </span>
      </span>
    </Link>
  );
}

function TruthfulEmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-low/50 px-5 py-7 text-sm leading-6 text-on-surface-variant">
      {message}
    </div>
  );
}

function StateSurface({
  icon,
  title,
  message,
}: {
  icon: string;
  title: string;
  message: string;
}) {
  return (
    <main className="storybook-page min-h-full">
      <div className="mx-auto max-w-[900px] px-5 py-12">
        <section className="rounded-[2rem] border border-outline-variant/70 bg-white/85 p-8 text-center shadow-sm">
          <span
            className="material-symbols-outlined text-4xl text-primary"
            aria-hidden="true"
          >
            {icon}
          </span>
          <h1 className="mt-4 text-2xl font-extrabold text-on-surface">
            {title}
          </h1>
          <p className="mx-auto mt-3 max-w-xl leading-7 text-on-surface-variant">
            {message}
          </p>
        </section>
      </div>
    </main>
  );
}

function conditionSentence(conditionStatus: string): string {
  switch (conditionStatus.toLowerCase()) {
    case "new":
      return "Yeni gibi görünüyor.";
    case "used":
      return "Daha önce kullanılmış.";
    case "damaged":
      return "Biraz zarar görmüş.";
    case "broken":
      return "Şu anda kullanılamayacak durumda.";
    case "repaired":
      return "Onarılmış ve yeniden yanında.";
    default:
      return "Durumu dünyada kayıtlı.";
  }
}
