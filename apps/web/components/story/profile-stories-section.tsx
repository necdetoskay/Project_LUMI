"use client";

import { useCallback, useEffect, useState } from "react";

import { CanonicalCharacterImage } from "@/components/assets/canonical-character-image";
import type { AdventureSummary } from "@/lib/stories/adventure-presentation";

type AdventureHubCharacter = {
  id: string;
  name: string;
};

type AdventureHubResponse = {
  character: AdventureHubCharacter | null;
  ongoingAdventure: AdventureSummary | null;
  pastAdventures: AdventureSummary[];
};

type StoriesResponse = {
  adventureHub?: AdventureHubResponse;
  message?: string;
};

export function ProfileStoriesSection({
  childProfileId,
}: {
  childProfileId: string;
}) {
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [adventureHub, setAdventureHub] = useState<AdventureHubResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newAdventureOpen, setNewAdventureOpen] = useState(false);

  const loadStories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const onboardRes = await fetch("/api/onboarding");
      const onboardData = (await onboardRes.json()) as {
        onboarding?: { householdId: string | null; hasHousehold: boolean };
      };
      const nextHouseholdId = onboardData.onboarding?.householdId ?? null;

      if (!nextHouseholdId) {
        setHouseholdId(null);
        setAdventureHub(null);
        setError("Hikâyelere ulaşmak için önce aile alanı hazır olmalı.");
        return;
      }

      setHouseholdId(nextHouseholdId);

      const response = await fetch(
        "/api/child-profiles/" +
          encodeURIComponent(childProfileId) +
          "/stories?householdId=" +
          encodeURIComponent(nextHouseholdId),
      );
      const body = (await response.json()) as StoriesResponse;

      if (!response.ok) {
        setAdventureHub(null);
        setError(body.message ?? "Maceralar şu anda yüklenemedi.");
        return;
      }

      setAdventureHub(
        body.adventureHub ?? {
          character: null,
          ongoingAdventure: null,
          pastAdventures: [],
        },
      );
    } catch {
      setAdventureHub(null);
      setError("Maceralar yüklenirken beklenmeyen bir sorun oluştu.");
    } finally {
      setLoading(false);
    }
  }, [childProfileId]);

  useEffect(() => {
    void loadStories();
  }, [loadStories]);

  if (loading) {
    return <AdventureHubSkeleton />;
  }

  if (error) {
    return (
      <section className="overflow-hidden rounded-[2rem] border border-outline-variant/70 bg-[#fffaf0] shadow-sm">
        <div className="px-5 py-8 text-center sm:px-7 md:px-9">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-error-container text-error">
            <span className="material-symbols-outlined text-3xl">
              cloud_off
            </span>
          </div>
          <h2 className="mt-4 text-xl font-extrabold text-on-surface">
            Maceralar biraz dinleniyor
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-on-surface-variant">
            {error}
          </p>
          <button
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-extrabold text-on-primary"
            onClick={() => void loadStories()}
            type="button"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
            Yeniden dene
          </button>
        </div>
      </section>
    );
  }

  const character = adventureHub?.character ?? null;
  const ongoingAdventure = adventureHub?.ongoingAdventure ?? null;
  const pastAdventures = adventureHub?.pastAdventures ?? [];
  const characterName = character?.name ?? "Karakterinin";
  const adventureHeading = character
    ? turkishPossessiveAdventureTitle(character.name)
    : "Karakterinin Maceraları";

  return (
    <section className="overflow-hidden rounded-[2rem] border border-outline-variant/70 bg-[#fffaf0] shadow-sm">
      <div className="relative px-4 py-6 sm:px-6 md:px-8 md:py-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-primary-fixed/45 blur-2xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/3 top-0 h-24 w-24 rounded-full bg-tertiary-fixed/45 blur-2xl"
        />

        <header className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
              <span className="material-symbols-outlined text-lg">
                auto_stories
              </span>
              Hikâyeler
            </div>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-on-surface md:text-4xl">
              {adventureHeading}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-on-surface-variant md:text-base md:leading-7">
              Devam eden maceranı sürdür ya da dünyanın sana hazırladığı yeni
              bir macerayı keşfet.
            </p>
          </div>

          <button
            aria-expanded={newAdventureOpen}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 self-start rounded-2xl bg-[#d68a24] px-5 text-sm font-extrabold text-white shadow-sm transition-transform hover:-translate-y-0.5"
            onClick={() => setNewAdventureOpen((current) => !current)}
            type="button"
          >
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-xl"
            >
              auto_awesome
            </span>
            Yeni Macera
          </button>
        </header>

        {newAdventureOpen ? (
          <div
            className="relative mt-5 rounded-2xl border border-[#ead7b6] bg-white/80 px-5 py-4 text-sm leading-6 text-on-surface-variant shadow-sm"
            role="status"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tertiary-fixed text-on-tertiary-fixed">
                <span className="material-symbols-outlined">explore</span>
              </div>
              <div>
                <p className="font-extrabold text-on-surface">
                  Yeni macera kapısı açılıyor
                </p>
                <p className="mt-1">
                  Dünya olayları, söylentiler, çantandaki eşyalar ve
                  dostlarından gelen çağrılar burada macera seçeneklerine
                  dönüşecek.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="relative mt-7">
          <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-on-surface">
            <span className="material-symbols-outlined text-primary">
              play_circle
            </span>
            Devam Eden Macera
          </div>

          {ongoingAdventure ? (
            <OngoingAdventureCard
              adventure={ongoingAdventure}
              character={character}
              householdId={householdId}
            />
          ) : (
            <EmptyAdventureCard onStart={() => setNewAdventureOpen(true)} />
          )}
        </div>

        {pastAdventures.length > 0 ? (
          <section className="relative mt-8" aria-labelledby="past-adventures">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h3
                  className="text-xl font-black text-on-surface"
                  id="past-adventures"
                >
                  Geçmiş Maceralar
                </h3>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Daha önce yaşadığın hikâyelere yeniden göz at.
                </p>
              </div>
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-3xl text-primary/60"
              >
                eco
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pastAdventures.slice(0, 6).map((adventure, index) => (
                <PastAdventureCard
                  adventure={adventure}
                  index={index}
                  key={adventure.sessionId}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}

function OngoingAdventureCard({
  adventure,
  character,
  householdId,
}: {
  adventure: AdventureSummary;
  character: AdventureHubCharacter | null;
  householdId: string | null;
}) {
  const location = adventure.highlights.find(
    (highlight) => highlight.kind === "location",
  );
  const secondaryHighlight = adventure.highlights.find(
    (highlight) => highlight.kind !== "location",
  );

  return (
    <article className="overflow-hidden rounded-[1.7rem] border border-[#dce8df] bg-white shadow-sm">
      <div className="grid lg:grid-cols-[minmax(280px,.9fr)_minmax(0,1.1fr)]">
        <div className="relative min-h-60 overflow-hidden bg-gradient-to-br from-[#d9eee1] via-[#dce9f7] to-[#f7e3ba] sm:min-h-72 lg:min-h-full">
          {character && householdId ? (
            <CanonicalCharacterImage
              characterId={character.id}
              householdId={householdId}
              characterName={character.name}
              className="absolute inset-0 h-full w-full object-cover"
              sizes="(max-width: 1024px) 100vw, 40vw"
              variant="head-three-quarter"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="material-symbols-outlined text-7xl text-primary/50">
                forest
              </span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/35 to-transparent" />
          <div className="absolute bottom-4 left-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-extrabold text-on-surface shadow-sm backdrop-blur">
            <span className="mr-1 align-middle material-symbols-outlined text-base text-primary">
              auto_awesome
            </span>
            Macera devam ediyor
          </div>
        </div>

        <div className="flex flex-col p-5 sm:p-6 md:p-7">
          <h3 className="text-2xl font-black leading-tight text-on-surface md:text-3xl">
            {adventure.title}
          </h3>
          <p className="mt-4 text-sm leading-7 text-on-surface-variant md:text-base">
            {adventure.playerRecap}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {location ? (
              <AdventurePill
                icon="location_on"
                label={`En son: ${location.label}`}
              />
            ) : adventure.currentSceneTitle ? (
              <AdventurePill
                icon="location_on"
                label={`En son: ${adventure.currentSceneTitle}`}
              />
            ) : null}
            {secondaryHighlight ? (
              <AdventurePill
                icon={secondaryHighlight.kind === "item" ? "backpack" : "group"}
                label={secondaryHighlight.label}
              />
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-extrabold text-on-primary shadow-sm transition-transform hover:-translate-y-0.5"
              href={`/app/stories/${encodeURIComponent(adventure.sessionId)}`}
            >
              <span className="material-symbols-outlined text-xl">
                play_arrow
              </span>
              Maceraya Devam Et
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

function AdventurePill({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#eef7f0] px-3 text-xs font-bold text-on-surface-variant">
      <span className="material-symbols-outlined text-base text-primary">
        {icon}
      </span>
      {label}
    </span>
  );
}

function PastAdventureCard({
  adventure,
  index,
}: {
  adventure: AdventureSummary;
  index: number;
}) {
  const icons = ["water", "pets", "air", "forest", "castle", "stars"];
  const icon = icons[index % icons.length] ?? "auto_stories";

  return (
    <a
      className="group overflow-hidden rounded-[1.4rem] border border-outline-variant/60 bg-white shadow-sm transition-transform hover:-translate-y-1"
      href={`/app/stories/${encodeURIComponent(adventure.sessionId)}`}
    >
      <div className="flex h-36 items-center justify-center bg-gradient-to-br from-primary-fixed/60 via-tertiary-fixed/55 to-[#f8dfb6]">
        <span className="material-symbols-outlined text-6xl text-primary/65 transition-transform group-hover:scale-110">
          {icon}
        </span>
      </div>
      <div className="p-4">
        <h4 className="text-base font-black leading-6 text-on-surface">
          {adventure.title}
        </h4>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-on-surface-variant">
          {adventure.playerRecap}
        </p>
        <div className="mt-3 flex items-center gap-1 text-xs font-extrabold text-primary">
          Hikâyeyi aç
          <span className="material-symbols-outlined text-base">
            arrow_forward
          </span>
        </div>
      </div>
    </a>
  );
}

function EmptyAdventureCard({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-[1.7rem] border border-dashed border-[#c8ddcf] bg-white/80 px-5 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-fixed text-primary">
        <span className="material-symbols-outlined text-3xl">explore</span>
      </div>
      <h3 className="mt-4 text-xl font-black text-on-surface">
        Yeni bir maceraya hazır mısın?
      </h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-on-surface-variant">
        Dünya, çantandaki eşyalar ve tanıdığın kişiler sana yeni bir hikâye
        başlangıcı sunabilir.
      </p>
      <button
        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#d68a24] px-5 text-sm font-extrabold text-white"
        onClick={onStart}
        type="button"
      >
        <span className="material-symbols-outlined">auto_awesome</span>
        Yeni Macera
      </button>
    </div>
  );
}

function turkishPossessiveAdventureTitle(name: string): string {
  const lower = name.toLocaleLowerCase("tr-TR");
  const vowels = [...lower].filter((character) =>
    "aeıioöuü".includes(character),
  );
  const lastVowel = vowels.at(-1) ?? "a";
  const suffix =
    lastVowel === "e" || lastVowel === "i"
      ? "in"
      : lastVowel === "ö" || lastVowel === "ü"
        ? "ün"
        : lastVowel === "o" || lastVowel === "u"
          ? "un"
          : "ın";
  const buffer = "aeıioöuü".includes(lower.at(-1) ?? "") ? "n" : "";

  return `${name}’${buffer}${suffix} Maceraları`;
}

function AdventureHubSkeleton() {
  return (
    <section
      aria-label="Maceralar yükleniyor"
      className="animate-pulse overflow-hidden rounded-[2rem] border border-outline-variant/70 bg-[#fffaf0] p-5 sm:p-7 md:p-8"
    >
      <div className="h-4 w-28 rounded-full bg-surface-container" />
      <div className="mt-3 h-10 w-64 max-w-full rounded-xl bg-surface-container" />
      <div className="mt-3 h-5 w-full max-w-xl rounded-full bg-surface-container-low" />
      <div className="mt-8 grid overflow-hidden rounded-[1.7rem] border border-outline-variant/50 bg-white lg:grid-cols-2">
        <div className="min-h-64 bg-surface-container" />
        <div className="space-y-4 p-6">
          <div className="h-8 w-3/4 rounded-lg bg-surface-container" />
          <div className="h-4 w-full rounded-full bg-surface-container-low" />
          <div className="h-4 w-5/6 rounded-full bg-surface-container-low" />
          <div className="h-11 w-44 rounded-xl bg-surface-container" />
        </div>
      </div>
    </section>
  );
}
