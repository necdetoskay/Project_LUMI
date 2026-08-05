"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  StorySessionList,
  type StorySessionSummary,
} from "@/components/story/story-session-list";

type StoryCatalogEntry = {
  definition: {
    id: string;
    title: string;
    storyType?: string;
    sourceType?: string;
  };
  version: {
    id: string;
    versionNumber: number;
    title: string;
    storyMode?: string;
    summary?: string | null;
  } | null;
};

type StorySource = {
  id: string;
  kind: "world_state" | "inventory" | "origin";
  title: string;
  summary: string;
  detail: string;
};

type LaunchOption = {
  character: {
    id: string;
    childProfileId: string;
    name: string;
    characterType: string;
    subtype: string;
  };
  world: {
    id: string;
    lifecycleStatus: string;
    label: string;
  } | null;
  storySources?: StorySource[];
};

type StoriesResponse = {
  sessions?: StorySessionSummary[];
  catalog?: StoryCatalogEntry[];
  launchOptions?: LaunchOption[];
};

type RankedStoryCatalogEntry = StoryCatalogEntry & {
  recommendationScore: number;
};

export function ProfileStoriesSection({
  childProfileId,
}: {
  childProfileId: string;
}) {
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<StorySessionSummary[]>([]);
  const [catalog, setCatalog] = useState<StoryCatalogEntry[]>([]);
  const [launchOptions, setLaunchOptions] = useState<LaunchOption[]>([]);
  const [selectedStoryId, setSelectedStoryId] = useState("");
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [playbackMode, setPlaybackMode] = useState("reading");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [launchOpen, setLaunchOpen] = useState(false);

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
        setError("Household bilgisi bulunamadi.");
        setSessions([]);
        setCatalog([]);
        setLaunchOptions([]);
        return;
      }

      setHouseholdId(nextHouseholdId);

      const response = await fetch(
        "/api/child-profiles/" +
          encodeURIComponent(childProfileId) +
          "/stories?householdId=" +
          encodeURIComponent(nextHouseholdId),
      );
      const body = (await response.json()) as StoriesResponse & {
        message?: string;
      };

      if (!response.ok) {
        setError(body.message ?? "Hikaye oturumlari yuklenemedi.");
        setSessions([]);
        setCatalog([]);
        setLaunchOptions([]);
        return;
      }

      const nextSessions = body.sessions ?? [];
      const nextCatalog = (body.catalog ?? []).filter((entry) => entry.version);
      const nextLaunchOptions = (body.launchOptions ?? []).filter(
        (entry) => entry.world,
      );

      setSessions(nextSessions);
      setCatalog(nextCatalog);
      setLaunchOptions(nextLaunchOptions);
      setSelectedStoryId(
        (current) => current || nextCatalog[0]?.definition.id || "",
      );
      setSelectedCharacterId(
        (current) => current || nextLaunchOptions[0]?.character.id || "",
      );
    } catch {
      setError("Hikaye oturumlari yuklenirken bir hata olustu.");
      setSessions([]);
      setCatalog([]);
      setLaunchOptions([]);
    } finally {
      setLoading(false);
    }
  }, [childProfileId]);

  useEffect(() => {
    void loadStories();
  }, [loadStories]);

  const selectedLaunch = useMemo(
    () =>
      launchOptions.find(
        (entry) => entry.character.id === selectedCharacterId,
      ) ?? null,
    [launchOptions, selectedCharacterId],
  );
  const selectedSource = useMemo(
    () =>
      selectedLaunch?.storySources?.find(
        (source) => source.id === selectedSourceId,
      ) ?? null,
    [selectedLaunch, selectedSourceId],
  );
  const rankedCatalog = useMemo(
    () => rankCatalogForSource(catalog, selectedSource),
    [catalog, selectedSource],
  );
  const recommendedStoryIds = useMemo(
    () =>
      new Set(
        rankedCatalog
          .filter((entry) => entry.recommendationScore > 0)
          .map((entry) => entry.definition.id),
      ),
    [rankedCatalog],
  );
  const selectedStory = useMemo(
    () =>
      rankedCatalog.find((entry) => entry.definition.id === selectedStoryId) ??
      null,
    [rankedCatalog, selectedStoryId],
  );
  const topRecommendation = rankedCatalog[0] ?? null;
  const selectedStoryRecommendation =
    selectedStory && selectedSource
      ? getStorySourceFit(selectedStory, selectedSource)
      : null;
  const canLaunch = Boolean(
    householdId &&
      selectedStory?.version?.id &&
      selectedLaunch?.world?.id &&
      selectedLaunch.character.id,
  );

  useEffect(() => {
    const nextSourceId = selectedLaunch?.storySources?.[0]?.id ?? "";
    setSelectedSourceId((current) =>
      current &&
      selectedLaunch?.storySources?.some((source) => source.id === current)
        ? current
        : nextSourceId,
    );
  }, [selectedLaunch]);

  useEffect(() => {
    if (rankedCatalog.length === 0) {
      if (selectedStoryId) {
        setSelectedStoryId("");
      }
      return;
    }

    const hasCurrent = rankedCatalog.some(
      (entry) => entry.definition.id === selectedStoryId,
    );
    if (!hasCurrent) {
      setSelectedStoryId(rankedCatalog[0]?.definition.id ?? "");
      return;
    }

    if (
      selectedSource &&
      selectedStoryId &&
      !recommendedStoryIds.has(selectedStoryId) &&
      recommendedStoryIds.size > 0
    ) {
      setSelectedStoryId(rankedCatalog[0]?.definition.id ?? selectedStoryId);
    }
  }, [rankedCatalog, recommendedStoryIds, selectedSource, selectedStoryId]);

  const handleLaunch = useCallback(async () => {
    if (
      !householdId ||
      !selectedStory?.version?.id ||
      !selectedLaunch?.world?.id
    ) {
      return;
    }

    setSubmitting(true);
    setLaunchError(null);

    try {
      const response = await fetch(
        "/api/stories/" +
          encodeURIComponent(selectedStory.definition.id) +
          "/sessions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            householdId,
            childProfileId,
            worldId: selectedLaunch.world.id,
            storyVersionId: selectedStory.version.id,
            characterId: selectedLaunch.character.id,
            playbackMode,
            idempotencyKey: crypto.randomUUID(),
          }),
        },
      );
      const body = (await response.json()) as {
        message?: string;
        session?: { session?: { id?: string } };
      };

      if (!response.ok) {
        setLaunchError(body.message ?? "Hikaye baslatilamadi.");
        return;
      }

      const sessionId = body.session?.session?.id;
      if (!sessionId) {
        setLaunchError("Oturum olustu ama session kimligi donmedi.");
        return;
      }

      window.location.href = "/app/stories/" + encodeURIComponent(sessionId);
    } catch {
      setLaunchError("Hikaye baslatilirken bir hata olustu.");
    } finally {
      setSubmitting(false);
    }
  }, [
    childProfileId,
    householdId,
    playbackMode,
    selectedLaunch,
    selectedStory,
  ]);

  return (
    <section className="rounded-2xl border border-outline-variant bg-white p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-on-surface">Hikayeler</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Devam eden oturumlari surdurun ya da karakterin mevcut baglamindan
            yeni bir hikaye baslatin.
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-outline-variant bg-white px-4 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low disabled:opacity-50"
          type="button"
          onClick={() => setLaunchOpen((current) => !current)}
          disabled={
            loading || catalog.length === 0 || launchOptions.length === 0
          }
        >
          <span className="material-symbols-outlined text-[18px]">
            auto_stories
          </span>
          {launchOpen ? "Kaynak secimini kapat" : "Yeni hikaye baslat"}
        </button>
      </div>

      {!loading && !error && sessions.length > 0 ? (
        <section className="mt-6 rounded-xl border border-outline-variant bg-surface-container-low p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px]">
              play_circle
            </span>
            Devam eden akislar
          </div>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
            Yarim kalan macerayi acmak genelde en hizli yoldur.
          </p>
          <StorySessionList sessions={sessions} />
        </section>
      ) : null}

      {launchOpen ? (
        <div className="mt-6 rounded-xl border border-outline-variant bg-surface-container-low p-5">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-on-surface">
                Karakter
                <select
                  className="mt-2 w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm font-medium text-on-surface"
                  value={selectedCharacterId}
                  onChange={(event) =>
                    setSelectedCharacterId(event.target.value)
                  }
                >
                  {launchOptions.map((entry) => (
                    <option key={entry.character.id} value={entry.character.id}>
                      {entry.character.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-semibold text-on-surface">
                Oynatim
                <select
                  className="mt-2 w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm font-medium text-on-surface"
                  value={playbackMode}
                  onChange={(event) => setPlaybackMode(event.target.value)}
                >
                  <option value="reading">Okuma</option>
                  <option value="narrated">Seslendirme</option>
                  <option value="mixed">Karisik</option>
                </select>
              </label>
            </div>

            <div>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-on-surface">
                  Hikaye kaynagi sec
                </p>
                <p className="text-sm leading-6 text-on-surface-variant">
                  Kullaniciya bos bir form gostermek yerine, eldeki baglamdan
                  bir cikis noktasi oneriyoruz.
                </p>
              </div>

              {selectedLaunch?.storySources &&
              selectedLaunch.storySources.length > 0 ? (
                <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
                  {selectedLaunch.storySources.map((source) => {
                    const isSelected = source.id === selectedSourceId;
                    return (
                      <button
                        key={source.id}
                        type="button"
                        onClick={() => setSelectedSourceId(source.id)}
                        className={[
                          "rounded-xl border bg-white p-4 text-left transition-colors",
                          isSelected
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-outline-variant hover:border-primary/30",
                        ].join(" ")}
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
                          {sourceKindLabel(source.kind)}
                        </p>
                        <h3 className="mt-2 text-base font-bold text-on-surface">
                          {source.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                          {source.summary}
                        </p>
                        <p className="mt-3 text-xs text-on-surface-variant">
                          {source.detail}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-outline-variant bg-white px-5 py-6 text-sm text-on-surface-variant">
                  Bu karakter icin henuz dunya veya canta tabanli bir cikis
                  noktasi derlenemedi.
                </div>
              )}

              <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="rounded-xl border border-outline-variant bg-white p-4">
                  <p className="text-sm font-semibold text-on-surface">
                    Hikaye sec
                  </p>
                  {selectedSource && topRecommendation ? (
                    <div className="mt-3 rounded-lg bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
                      <p className="font-semibold text-on-surface">
                        Onerilen eslesme
                      </p>
                      <p className="mt-2">
                        {topRecommendation.definition.title} secilen baglamla
                        daha uyumlu gorunuyor.
                      </p>
                    </div>
                  ) : null}
                  <select
                    className="mt-3 w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm font-medium text-on-surface"
                    value={selectedStoryId}
                    onChange={(event) => setSelectedStoryId(event.target.value)}
                  >
                    {rankedCatalog.map((entry) => (
                      <option
                        key={entry.definition.id}
                        value={entry.definition.id}
                      >
                        {recommendedStoryIds.has(entry.definition.id)
                          ? "Onerilen - "
                          : ""}
                        {entry.definition.title} - v
                        {entry.version?.versionNumber}
                      </option>
                    ))}
                  </select>
                  {selectedSource ? (
                    <div className="mt-4 rounded-lg bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
                      <p className="font-semibold text-on-surface">
                        Secilen baglam
                      </p>
                      <p className="mt-2">{selectedSource.summary}</p>
                      {selectedStoryRecommendation ? (
                        <p className="mt-2 text-on-surface">
                          {selectedStoryRecommendation.label}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-xl border border-outline-variant bg-white p-4">
                  <p className="text-sm font-semibold text-on-surface">
                    Baslatma ozeti
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-on-surface-variant">
                    <p>Karakter: {selectedLaunch?.character.name ?? "-"}</p>
                    <p>Dunya: {selectedLaunch?.world?.label ?? "-"}</p>
                    <p>Kaynak: {selectedSource?.title ?? "Baglam sec"}</p>
                    <p>Hikaye: {selectedStory?.definition.title ?? "-"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {launchError ? (
            <div className="mt-4 rounded-lg border border-error-container bg-white px-4 py-3 text-sm text-error">
              {launchError}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-[#4c29cf] disabled:opacity-50"
              type="button"
              onClick={() => void handleLaunch()}
              disabled={!canLaunch || submitting}
            >
              {submitting ? "Baslatiliyor..." : "Bu baglamdan hikaye baslat"}
            </button>
            <button
              className="inline-flex h-10 items-center rounded-lg border border-outline-variant bg-white px-4 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low"
              type="button"
              onClick={() => setLaunchOpen(false)}
            >
              Vazgec
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="mt-6 text-sm text-on-surface-variant">
          Hikaye oturumlari yukleniyor...
        </p>
      ) : error ? (
        <div className="mt-6 rounded-xl border border-error-container bg-white px-5 py-4 text-sm text-error">
          {error}
        </div>
      ) : launchOptions.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-6 py-8 text-sm text-on-surface-variant">
          Yeni hikaye baslatmak icin once bu profile bagli bir karakter ve dunya
          hazir olmali.
        </div>
      ) : sessions.length === 0 && !launchOpen ? (
        <div className="mt-6 rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-6 py-8 text-sm text-on-surface-variant">
          Bu profilde henuz aktif bir hikaye yok. Yeni hikaye baslat diyerek
          karakterin mevcut baglamindan bir cikis noktasi sec.
        </div>
      ) : null}
    </section>
  );
}

function sourceKindLabel(kind: StorySource["kind"]): string {
  switch (kind) {
    case "world_state":
      return "Dunya durumu";
    case "inventory":
      return "Canta ipucu";
    case "origin":
      return "Karakter izi";
    default:
      return "Baglam";
  }
}

function rankCatalogForSource(
  catalog: StoryCatalogEntry[],
  source: StorySource | null,
): RankedStoryCatalogEntry[] {
  return [...catalog]
    .map((entry) => ({
      ...entry,
      recommendationScore: source ? getStorySourceFit(entry, source).score : 0,
    }))
    .sort((left, right) => {
      if (right.recommendationScore !== left.recommendationScore) {
        return right.recommendationScore - left.recommendationScore;
      }

      return left.definition.title.localeCompare(right.definition.title, "tr");
    });
}

function getStorySourceFit(
  entry: StoryCatalogEntry,
  source: StorySource,
): { score: number; label: string } {
  const storyType = entry.definition.storyType ?? "";
  const storyMode = entry.version?.storyMode ?? "";
  const haystack = [
    entry.definition.title,
    entry.version?.title ?? "",
    entry.version?.summary ?? "",
  ]
    .join(" ")
    .toLocaleLowerCase("tr");
  const sourceText = [source.title, source.summary, source.detail]
    .join(" ")
    .toLocaleLowerCase("tr");

  let score = 0;
  const reasons: string[] = [];

  if (source.kind === "world_state") {
    if (storyType === "world_event") {
      score += 4;
      reasons.push("dunya olayi akisi");
    }
    if (storyType === "continuing") {
      score += 2;
      reasons.push("devam eden macera yapisi");
    }
  }

  if (source.kind === "inventory") {
    if (storyMode === "interactive") {
      score += 3;
      reasons.push("esya tetikli secim ritmi");
    }
    if (storyType === "interactive" || storyType === "continuing") {
      score += 2;
      reasons.push("hareketli ilerleme yapisi");
    }
  }

  if (source.kind === "origin") {
    if (storyType === "continuing") {
      score += 3;
      reasons.push("karakter yolculugunu surdurme");
    }
    if (storyType === "reflection" || storyType === "static") {
      score += 2;
      reasons.push("karakter kokenine yaslanan ton");
    }
  }

  for (const token of tokenizeSourceText(sourceText)) {
    if (token.length < 4) {
      continue;
    }
    if (haystack.includes(token)) {
      score += 1;
      reasons.push(`"${token}" izi`);
    }
  }

  if (reasons.length === 0) {
    return {
      score,
      label: "Bu secim genel katalog akisiyla baslatilacak.",
    };
  }

  return {
    score,
    label: `Bu hikaye secilen baglamla uyumlu: ${reasons.slice(0, 2).join(", ")}.`,
  };
}

function tokenizeSourceText(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[^a-z0-9çğıöşü]+/i)
        .map((token) => token.trim())
        .filter(Boolean),
    ),
  );
}
