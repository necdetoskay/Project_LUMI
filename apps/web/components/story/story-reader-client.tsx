"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CanonicalCharacterImage } from "@/components/assets/canonical-character-image";
import { newIdempotencyKey } from "@/lib/new-id";

type ReaderOption = {
  option: {
    id: string;
    label: string;
    consequencePreviews?: unknown;
  };
  available: boolean;
  reasonCode: string | null;
  nextSceneId: string | null;
};

type ReaderChoice = {
  point: {
    id: string;
    prompt: string;
  };
  options: ReaderOption[];
};

type ChoiceHistoryEntry = {
  id: string;
  choicePointId: string;
  optionId: string;
  evidenceSceneId: string;
  ruleVersion: number;
  committedAt: string;
};

type CheckpointSummary = {
  id: string;
  sceneId: string;
  checkpointType: string;
  sequenceNumber: number;
  createdAt: string;
};

type QuestObjectiveEntry = {
  index: number;
  title: string;
  status: string;
  statusLabel: string;
};

type QuestEntry = {
  id: string;
  title: string;
  summary: string;
  status: string;
  statusLabel: string;
  objectives: QuestObjectiveEntry[];
};

type ReaderPayload = {
  playback: {
    session: {
      id: string;
      childProfileId: string;
      storyVersionId: string;
      sessionStatus: string;
      playbackMode: string;
      version: number;
      updatedAt: string;
    };
    characters?: Array<{
      characterId: string;
      participationRole: string;
    }>;
    currentScene: {
      id: string;
      sceneKey: string;
      title: string | null;
      narrativeText: string;
      media?: {
        image?: {
          src: string;
          alt?: string | null;
          caption?: string | null;
        } | null;
        audio?: {
          src: string;
          transcript?: string | null;
        } | null;
      } | null;
    } | null;
    visits: Array<{ id: string }>;
    latestCheckpoint: {
      contentHash: string;
      createdAt: string;
    } | null;
  };
  graph: {
    version: {
      id: string;
      versionNumber: number;
      title: string;
    };
  };
  choices: ReaderChoice[];
};

type OnboardingPayload = {
  onboarding?: {
    householdId: string | null;
  };
};

type ChildProfileSummary = {
  id: string;
  displayName: string;
  ageBand: string;
};

export function StoryReaderClient({ sessionId }: { sessionId: string }) {
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [payload, setPayload] = useState<ReaderPayload | null>(null);
  const [childProfile, setChildProfile] = useState<ChildProfileSummary | null>(
    null,
  );
  const [choiceHistory, setChoiceHistory] = useState<ChoiceHistoryEntry[]>([]);
  const [latestCheckpoint, setLatestCheckpoint] =
    useState<CheckpointSummary | null>(null);
  const [quests, setQuests] = useState<QuestEntry[]>([]);
  const [auxWarnings, setAuxWarnings] = useState<string[]>([]);
  const [mediaWarnings, setMediaWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkpointSaving, setCheckpointSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [expandedHints, setExpandedHints] = useState<string[]>([]);
  const [failedMedia, setFailedMedia] = useState({
    image: false,
    audio: false,
  });

  const loadReader = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAuxWarnings([]);
    setMediaWarnings([]);

    try {
      const onboardingRes = await fetch("/api/onboarding");
      const onboardingData = (await onboardingRes.json()) as OnboardingPayload;
      const nextHouseholdId = onboardingData.onboarding?.householdId ?? null;

      if (!nextHouseholdId) {
        setError("Household bilgisi bulunamadi.");
        setPayload(null);
        setChildProfile(null);
        setChoiceHistory([]);
        setLatestCheckpoint(null);
        setQuests([]);
        return;
      }

      setHouseholdId(nextHouseholdId);

      const readerUrl = `/api/stories/sessions/${encodeURIComponent(sessionId)}/reader?householdId=${encodeURIComponent(nextHouseholdId)}`;
      const historyUrl = `/api/stories/sessions/${encodeURIComponent(sessionId)}/choices/history?householdId=${encodeURIComponent(nextHouseholdId)}`;
      const checkpointUrl = `/api/stories/sessions/${encodeURIComponent(sessionId)}/checkpoints/latest?householdId=${encodeURIComponent(nextHouseholdId)}`;
      const questsUrl = `/api/stories/sessions/${encodeURIComponent(sessionId)}/quests?householdId=${encodeURIComponent(nextHouseholdId)}`;

      const [readerRes, historyResult, checkpointResult, questsResult] =
        await Promise.all([
          fetch(readerUrl),
          fetch(historyUrl)
            .then((response) => ({ ok: true as const, response }))
            .catch(() => ({ ok: false as const })),
          fetch(checkpointUrl)
            .then((response) => ({ ok: true as const, response }))
            .catch(() => ({ ok: false as const })),
          fetch(questsUrl)
            .then((response) => ({ ok: true as const, response }))
            .catch(() => ({ ok: false as const })),
        ]);

      if (!readerRes.ok) {
        const body = (await readerRes.json()) as { message?: string };
        setError(body.message ?? "Story Reader yuklenemedi.");
        setPayload(null);
        setChildProfile(null);
        setChoiceHistory([]);
        setLatestCheckpoint(null);
        setQuests([]);
        return;
      }

      const nextPayload = (await readerRes.json()) as ReaderPayload;
      setPayload(nextPayload);

      const nextChildProfileId = nextPayload.playback.session.childProfileId;
      if (nextChildProfileId) {
        try {
          const profileResponse = await fetch(
            `/api/child-profiles/${encodeURIComponent(nextChildProfileId)}?householdId=${encodeURIComponent(nextHouseholdId)}`,
          );
          if (profileResponse.ok) {
            const profileBody = (await profileResponse.json()) as {
              profile?: ChildProfileSummary;
            };
            setChildProfile(profileBody.profile ?? null);
          } else {
            setChildProfile(null);
          }
        } catch {
          setChildProfile(null);
        }
      } else {
        setChildProfile(null);
      }

      const nextWarnings: string[] = [];

      if (historyResult.ok && historyResult.response.ok) {
        try {
          const body = (await historyResult.response.json()) as {
            history?: ChoiceHistoryEntry[];
          };
          setChoiceHistory(body.history ?? []);
        } catch {
          setChoiceHistory([]);
          nextWarnings.push("Secim gecmisi su anda yuklenemedi.");
        }
      } else {
        setChoiceHistory([]);
        nextWarnings.push("Secim gecmisi su anda yuklenemedi.");
      }

      if (checkpointResult.ok && checkpointResult.response.ok) {
        try {
          const body = (await checkpointResult.response.json()) as {
            checkpoint?: CheckpointSummary | null;
          };
          setLatestCheckpoint(body.checkpoint ?? null);
        } catch {
          setLatestCheckpoint(null);
          nextWarnings.push("Checkpoint ozeti su anda yuklenemedi.");
        }
      } else {
        setLatestCheckpoint(null);
        nextWarnings.push("Checkpoint ozeti su anda yuklenemedi.");
      }

      if (questsResult.ok && questsResult.response.ok) {
        try {
          const body = (await questsResult.response.json()) as {
            quests?: QuestEntry[];
          };
          setQuests(body.quests ?? []);
        } catch {
          setQuests([]);
          nextWarnings.push("Gorev listesi su anda yuklenemedi.");
        }
      } else {
        setQuests([]);
        nextWarnings.push("Gorev listesi su anda yuklenemedi.");
      }

      setAuxWarnings(nextWarnings);
    } catch {
      setError("Story Reader yuklenirken bir hata olustu.");
      setPayload(null);
      setChildProfile(null);
      setChoiceHistory([]);
      setLatestCheckpoint(null);
      setQuests([]);
      setAuxWarnings([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void loadReader();
  }, [loadReader]);

  const currentScene = payload?.playback.currentScene ?? null;
  const childProfileId = payload?.playback.session.childProfileId ?? null;
  const sessionVersion = payload?.playback.session.version ?? 0;
  const isPaused = payload?.playback.session.sessionStatus === "paused";
  const imageMedia = currentScene?.media?.image ?? null;
  const audioMedia = currentScene?.media?.audio ?? null;
  const protagonist =
    payload?.playback.characters?.find(
      (entry) => entry.participationRole === "protagonist",
    ) ??
    payload?.playback.characters?.[0] ??
    null;

  useEffect(() => {
    setFailedMedia({
      image: false,
      audio: false,
    });
    setMediaWarnings([]);
    setExpandedHints([]);
  }, [currentScene?.id]);

  const statusLabel = useMemo(() => {
    if (!payload) {
      return "-";
    }

    return `${payload.playback.session.sessionStatus} / ${payload.playback.session.playbackMode}`;
  }, [payload]);

  const addMediaWarning = useCallback((warning: string) => {
    setMediaWarnings((currentWarnings) =>
      currentWarnings.includes(warning)
        ? currentWarnings
        : [...currentWarnings, warning],
    );
  }, []);

  const reflectionQuestions = useMemo(() => {
    const sceneTitle =
      currentScene?.title ?? currentScene?.sceneKey ?? "bu sahne";
    const primaryChoiceLabel =
      payload?.choices[0]?.options[0]?.option.label ?? null;

    switch (childProfile?.ageBand) {
      case "3-5":
        return [
          `${sceneTitle} icinde sana en sicak gelen sey neydi?`,
          primaryChoiceLabel
            ? `Bir sonraki adimda ${primaryChoiceLabel.toLowerCase()} nasil hissettirir?`
            : "Bir sonraki adimda en cok neyi merak ediyorsun?",
        ];
      case "9-12":
        return [
          `${sceneTitle} sahnesinde karakterin hangi secimi daha dikkatli dusunmesi gerekir?`,
          primaryChoiceLabel
            ? `${primaryChoiceLabel} seceneginin iyi ve zor yanlari neler olabilir?`
            : "Bu sahnenin sonraki adimi icin hangi ipuclari daha belirleyici gorunuyor?",
          "Sahnedeki duyguyu degistiren en onemli ayrinti hangisi?",
        ];
      case "13+":
        return [
          `${sceneTitle} sahnesinin tonu sana hangi mesaji veriyor?`,
          primaryChoiceLabel
            ? `${primaryChoiceLabel} secenegi karakterin degerleriyle ne kadar uyumlu?`
            : "Bu sahnenin devaminda hangi secim en tutarli yol gibi gorunuyor?",
          "Ayni durumda sen olsaydin hangi bilgiyi daha once toplamak isterdin?",
        ];
      case "6-8":
      default:
        return [
          `${sceneTitle} sahnesinde en cok hangi ayrinti aklinda kaldi?`,
          primaryChoiceLabel
            ? `${primaryChoiceLabel} secenegi sence nasil bir maceraya acilabilir?`
            : "Bir sonraki adimda ne olmasini umuyorsun?",
        ];
    }
  }, [
    childProfile?.ageBand,
    currentScene?.sceneKey,
    currentScene?.title,
    payload?.choices,
  ]);

  const reflectionIntro = useMemo(() => {
    switch (childProfile?.ageBand) {
      case "3-5":
        return "Kisa ve sicak sorularla sahneyi birlikte dusunebilirsiniz.";
      case "9-12":
        return "Secimden once nedenleri tartmak icin biraz dusunme alani birakir.";
      case "13+":
        return "Ton, niyet ve olasi sonuc uzerine daha derin dusunmeyi destekler.";
      case "6-8":
      default:
        return "Nazik sorular, sahneyi acele etmeden anlamaya yardim eder.";
    }
  }, [childProfile?.ageBand]);

  const interactionSupportCopy = useMemo(() => {
    switch (childProfile?.ageBand) {
      case "3-5":
        return "Secenekleri yavasca okuyup birlikte bir his secmek iyi calisir.";
      case "9-12":
        return "Istersen nazik ipucunu acip seceneklerin havasini karsilastirabilirsin.";
      case "13+":
        return "Secmeden once ipucu ve sahne tonunu karsilastirmak daha bilincli ilerletir.";
      case "6-8":
      default:
        return "Nazik ipucu, secimin yonunu hissettirir ama sonucu onceden soylemez.";
    }
  }, [childProfile?.ageBand]);

  const toggleHint = useCallback((hintId: string) => {
    setExpandedHints((currentIds) =>
      currentIds.includes(hintId)
        ? currentIds.filter((currentId) => currentId !== hintId)
        : [...currentIds, hintId],
    );
  }, []);

  async function postAction(path: string, body: Record<string, unknown>) {
    if (!householdId) {
      throw new Error("householdId missing");
    }

    const response = await fetch(
      `${path}?householdId=${encodeURIComponent(householdId)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const data = (await response.json()) as { message?: string };
      throw new Error(data.message ?? "Istek basarisiz.");
    }
  }

  const handlePlaybackToggle = useCallback(async () => {
    if (!payload) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setInfo(null);

    try {
      const action = isPaused ? "resume" : "pause";
      await postAction(
        `/api/stories/sessions/${encodeURIComponent(sessionId)}/${action}`,
        {
          expectedVersion: sessionVersion,
          idempotencyKey: newIdempotencyKey(),
        },
      );
      await loadReader();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Durum guncellenemedi.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [isPaused, loadReader, payload, sessionId, sessionVersion]);

  const handleCommitChoice = useCallback(
    async (choicePointId: string, option: ReaderOption) => {
      if (!payload || !currentScene) {
        return;
      }

      setSubmitting(true);
      setError(null);
      setInfo(null);

      try {
        await postAction(
          `/api/stories/sessions/${encodeURIComponent(sessionId)}/choices/${encodeURIComponent(choicePointId)}/commit`,
          {
            optionId: option.option.id,
            evidenceSceneId: currentScene.id,
            idempotencyKey: newIdempotencyKey(),
          },
        );

        if (option.nextSceneId) {
          await postAction(
            `/api/stories/sessions/${encodeURIComponent(sessionId)}/advance`,
            {
              expectedVersion: sessionVersion,
              nextSceneId: option.nextSceneId,
              idempotencyKey: newIdempotencyKey(),
            },
          );
        } else {
          setInfo(
            "Secim kaydedildi. Sonraki sahne baglantisi bu versiyonda henuz tanimli degil.",
          );
        }

        await loadReader();
      } catch (nextError) {
        setError(
          nextError instanceof Error ? nextError.message : "Secim islenemedi.",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [currentScene, loadReader, payload, sessionId, sessionVersion],
  );

  const handleCompleteSession = useCallback(async () => {
    if (!payload || !currentScene) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setInfo(null);

    try {
      await postAction(
        `/api/stories/sessions/${encodeURIComponent(sessionId)}/complete`,
        {
          expectedVersion: sessionVersion,
          idempotencyKey: newIdempotencyKey(),
        },
      );
      setInfo("Hikâye tamamlandı.");
      await loadReader();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Hikâye tamamlanamadı.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [currentScene, loadReader, payload, sessionId, sessionVersion]);

  const handleManualCheckpoint = useCallback(async () => {
    if (!currentScene) {
      return;
    }

    setCheckpointSaving(true);
    setError(null);
    setInfo(null);

    try {
      await postAction(
        `/api/stories/sessions/${encodeURIComponent(sessionId)}/checkpoints`,
        {
          sceneId: currentScene.id,
        },
      );
      setInfo("Manuel checkpoint kaydedildi.");
      await loadReader();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Checkpoint kaydedilemedi.",
      );
    } finally {
      setCheckpointSaving(false);
    }
  }, [currentScene, loadReader, sessionId]);

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-[1180px] px-6 py-10">
        <div className="rounded-2xl border border-outline-variant bg-white px-6 py-8 text-on-surface-variant">
          Story Reader yukleniyor...
        </div>
      </section>
    );
  }

  if (error && !payload) {
    return (
      <section className="mx-auto w-full max-w-[1180px] px-6 py-10">
        <div className="rounded-2xl border border-error-container bg-white px-6 py-8">
          <p className="text-error" aria-live="assertive">
            {error}
          </p>
          <button
            className="mt-4 inline-flex h-10 items-center rounded-lg border border-outline-variant bg-white px-4 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low disabled:opacity-50"
            type="button"
            onClick={() => void loadReader()}
            disabled={loading}
          >
            Tekrar dene
          </button>
        </div>
      </section>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-[1180px] flex-col px-6 py-10">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm font-semibold text-on-surface-variant">
        <a className="transition-colors hover:text-primary" href="/app">
          Dashboard
        </a>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        {childProfileId ? (
          <a
            className="transition-colors hover:text-primary"
            href={`/app/profiles/${childProfileId}`}
          >
            {childProfile?.displayName ?? "Profil"}
          </a>
        ) : null}
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <span className="text-primary">Story Reader</span>
      </nav>

      <header className="rounded-2xl border border-outline-variant bg-white p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            {protagonist && householdId ? (
              <CanonicalCharacterImage
                characterId={protagonist.characterId}
                householdId={householdId}
                characterName="Hikaye karakteri"
                className="h-20 w-20 shrink-0 rounded-2xl border border-outline-variant shadow-sm"
                sizes="80px"
                variant="head-three-quarter"
              />
            ) : null}
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
                Story Reader
              </p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-on-surface">
                {currentScene?.title ??
                  currentScene?.sceneKey ??
                  "Story session"}
              </h1>
              <p className="mt-2 text-sm text-on-surface-variant">
                Durum: {statusLabel} | Ziyaret:{" "}
                {payload?.playback.visits.length ?? 0}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                {childProfile ? (
                  <a
                    className="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-3 py-1.5 font-semibold text-on-surface transition-colors hover:bg-surface-container"
                    href={`/app/profiles/${encodeURIComponent(childProfile.id)}`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      badge
                    </span>
                    {childProfile.displayName}
                  </a>
                ) : null}
                {childProfileId ? (
                  <a
                    className="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-3 py-1.5 font-semibold text-on-surface transition-colors hover:bg-surface-container"
                    href={`/app/profiles/${encodeURIComponent(childProfileId)}/world`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      travel_explore
                    </span>
                    Haritayi incele
                  </a>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="inline-flex h-10 items-center rounded-lg border border-outline-variant bg-white px-4 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low disabled:opacity-50"
              type="button"
              onClick={() => void loadReader()}
              disabled={submitting || checkpointSaving}
            >
              Yenile
            </button>
            <button
              className="inline-flex h-10 items-center rounded-lg border border-outline-variant bg-white px-4 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low disabled:opacity-50"
              type="button"
              onClick={() => void handleManualCheckpoint()}
              disabled={submitting || checkpointSaving || !currentScene}
            >
              {checkpointSaving ? "Kaydediliyor..." : "Checkpoint al"}
            </button>
            <button
              className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-[#4c29cf] disabled:opacity-50"
              type="button"
              onClick={() => void handlePlaybackToggle()}
              disabled={submitting || checkpointSaving || !payload}
            >
              {isPaused ? "Devam ettir" : "Duraklat"}
            </button>
          </div>
        </div>
      </header>

      {error ? (
        <div
          className="mt-6 rounded-xl border border-error-container bg-white px-5 py-4 text-sm text-error"
          aria-live="assertive"
        >
          {error}
        </div>
      ) : null}
      {info ? (
        <div
          className="mt-6 rounded-xl border border-outline-variant bg-white px-5 py-4 text-sm text-on-surface"
          aria-live="polite"
        >
          {info}
        </div>
      ) : null}
      {auxWarnings.length > 0 ? (
        <div className="mt-6 rounded-xl border border-outline-variant bg-surface-container-low px-5 py-4 text-sm text-on-surface-variant">
          {auxWarnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}
      {mediaWarnings.length > 0 ? (
        <div className="mt-6 rounded-xl border border-outline-variant bg-surface-container-low px-5 py-4 text-sm text-on-surface-variant">
          {mediaWarnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}

      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
        <InfoTile
          label="Profil"
          value={childProfile?.displayName ?? "Baglanamadi"}
        />
        <InfoTile label="Yas grubu" value={childProfile?.ageBand ?? "-"} />
        <InfoTile label="Durum" value={statusLabel} />
        <InfoTile
          label="Ziyaret"
          value={String(payload?.playback.visits.length ?? 0)}
        />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <article className="rounded-2xl border border-outline-variant bg-white p-6 md:p-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px]">
              auto_stories
            </span>
            Mevcut sahne
          </div>
          <h2
            className="mt-4 text-2xl font-bold text-on-surface"
            data-testid="story-scene-title"
          >
            {currentScene?.title ??
              currentScene?.sceneKey ??
              "Sahne bekleniyor"}
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)]">
            <section
              className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low"
              aria-label="Sahne gorseli"
            >
              {imageMedia && !failedMedia.image ? (
                <>
                  <img
                    className="h-full min-h-[220px] w-full object-cover"
                    src={imageMedia.src}
                    alt={imageMedia.alt ?? "Sahne gorseli"}
                    onError={() => {
                      setFailedMedia((currentValue) => ({
                        ...currentValue,
                        image: true,
                      }));
                      addMediaWarning(
                        "Sahne gorseli yuklenemedi. Okumaya metinle devam edebilirsin.",
                      );
                    }}
                  />
                  {imageMedia.caption ? (
                    <p className="border-t border-outline-variant px-4 py-3 text-sm text-on-surface-variant">
                      {imageMedia.caption}
                    </p>
                  ) : null}
                </>
              ) : (
                <div className="flex min-h-[220px] items-center justify-center px-6 py-8 text-center text-sm leading-6 text-on-surface-variant">
                  {failedMedia.image
                    ? "Bu sahnenin gorseli acilamadi."
                    : "Bu sahne icin gorsel henuz hazir degil."}
                </div>
              )}
            </section>

            <section
              className="rounded-xl border border-outline-variant bg-surface-container-low p-5"
              aria-label="Sahne sesi"
            >
              <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
                Ses
              </h3>
              {audioMedia && !failedMedia.audio ? (
                <>
                  <audio
                    className="mt-4 w-full"
                    controls
                    preload="metadata"
                    src={audioMedia.src}
                    onError={() => {
                      setFailedMedia((currentValue) => ({
                        ...currentValue,
                        audio: true,
                      }));
                      addMediaWarning(
                        "Ses oynatma su anda kullanilamiyor. Okumaya metinle devam edebilirsin.",
                      );
                    }}
                  >
                    Tarayicin ses oynatmayi desteklemiyor.
                  </audio>
                  <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                    Ses oynatimi istege baglidir. Metin her zaman okunabilir
                    durumda kalir.
                  </p>
                  {audioMedia.transcript ? (
                    <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                      Transcript: {audioMedia.transcript}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="mt-4 text-sm leading-6 text-on-surface-variant">
                  {failedMedia.audio
                    ? "Bu sahnenin sesi su anda oynatilamiyor."
                    : "Bu sahne icin seslendirme henuz hazir degil. Okumaya metinle devam edebilirsin."}
                </p>
              )}
            </section>
          </div>
          <p
            className="mt-4 whitespace-pre-wrap text-base leading-7 text-on-surface"
            data-testid="story-narrative"
          >
            {currentScene?.narrativeText ??
              "Bu oturum icin aktif sahne bulunamadi."}
          </p>
        </article>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-outline-variant bg-white p-6">
            <h2 className="text-lg font-bold text-on-surface">Oturum ozeti</h2>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <InfoTile
                label="Checkpoint"
                value={payload?.playback.latestCheckpoint?.createdAt ?? "Yok"}
              />
              <InfoTile
                label="Versiyon"
                value={`v${payload?.graph.version.versionNumber ?? "-"} ${payload?.graph.version.title ?? ""}`}
              />
              <InfoTile
                label="Son guncelleme"
                value={payload?.playback.session.updatedAt ?? "-"}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-outline-variant bg-white p-6">
            <h2 className="text-lg font-bold text-on-surface">
              Checkpoint durumu
            </h2>
            {latestCheckpoint ? (
              <div className="mt-4 grid grid-cols-1 gap-3">
                <InfoTile label="Tip" value={latestCheckpoint.checkpointType} />
                <InfoTile
                  label="Sira"
                  value={`#${latestCheckpoint.sequenceNumber}`}
                />
                <InfoTile label="Zaman" value={latestCheckpoint.createdAt} />
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                Bu oturum icin henuz checkpoint bulunmuyor.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-outline-variant bg-white p-6">
            <h2 className="text-lg font-bold text-on-surface">
              Dusunme molasi
            </h2>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">
              {reflectionIntro}
            </p>
            <div className="mt-4 space-y-3">
              {reflectionQuestions.map((question) => (
                <div
                  key={question}
                  className="rounded-xl border border-outline-variant bg-surface-container-low p-4 text-sm leading-6 text-on-surface"
                >
                  {question}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-outline-variant bg-white p-6">
            <h2 className="text-lg font-bold text-on-surface">
              Erisilebilirlik
            </h2>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">
              Sahne metni tek kolon okunuyor, butonlar klavye odakli ve hata
              durumlari ekranda acik sekilde gosteriliyor.
            </p>
          </section>
        </aside>
      </section>

      <section
        className="mt-6 rounded-2xl border border-outline-variant bg-white p-6 md:p-8"
        aria-busy={submitting || checkpointSaving}
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px]">bolt</span>
          Etkilesim
        </div>
        <p className="mt-3 text-sm leading-6 text-on-surface-variant">
          {interactionSupportCopy}
        </p>
        {payload && payload.choices.length > 0 ? (
          <div className="mt-6 space-y-6">
            {payload.choices.map((choice) => (
              <div
                key={choice.point.id}
                className="rounded-xl border border-outline-variant bg-surface-container-low p-5"
              >
                <h3 className="text-lg font-bold text-on-surface">
                  {choice.point.prompt}
                </h3>
                <div className="mt-4 grid grid-cols-1 gap-3">
                  {choice.options.map((option) => {
                    const hintTexts = getHintTexts(option);
                    const hintId = `${choice.point.id}:${option.option.id}`;
                    const isHintExpanded = expandedHints.includes(hintId);

                    return (
                      <div
                        key={option.option.id}
                        className="rounded-lg border border-outline-variant bg-white p-3"
                      >
                        <button
                          className="flex min-h-12 w-full items-center justify-between text-left text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50"
                          data-testid="story-choice-option"
                          type="button"
                          aria-label={option.option.label}
                          onClick={() =>
                            void handleCommitChoice(choice.point.id, option)
                          }
                          disabled={
                            submitting || checkpointSaving || !option.available
                          }
                        >
                          <span>{option.option.label}</span>
                          <span className="pl-4 text-xs font-medium text-on-surface-variant">
                            {option.available
                              ? option.nextSceneId
                                ? "Sahneye gec"
                                : "Kaydet"
                              : (option.reasonCode ?? "Kullanilamaz")}
                          </span>
                        </button>
                        {hintTexts.length > 0 ? (
                          <div className="mt-3 border-t border-outline-variant pt-3">
                            <button
                              className="text-sm font-semibold text-primary transition-colors hover:text-[#4c29cf]"
                              type="button"
                              aria-expanded={isHintExpanded}
                              onClick={() => toggleHint(hintId)}
                            >
                              {isHintExpanded ? "Ipucunu gizle" : "Nazik ipucu"}
                            </button>
                            {isHintExpanded ? (
                              <div className="mt-3 rounded-lg bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
                                <p className="font-semibold text-on-surface">
                                  Secenek hissi
                                </p>
                                <ul className="mt-2 space-y-2">
                                  {hintTexts.map((hintText) => (
                                    <li key={hintText}>{hintText}</li>
                                  ))}
                                </ul>
                                <p className="mt-3 text-xs leading-5">
                                  Bu ipuclari yon gosterir; kesin sonucu onceden
                                  soylemez.
                                </p>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : payload?.playback.session.sessionStatus === "completed" ? (
          <div className="mt-4 rounded-xl border border-primary/20 bg-primary-fixed/35 p-5">
            <p className="font-semibold text-on-surface">Hikâye tamamlandı.</p>
            {childProfileId ? (
              <a
                className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary"
                href={`/app/profiles/${encodeURIComponent(childProfileId)}?tab=stories`}
              >
                Hikâyelere dön
              </a>
            ) : null}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-outline-variant bg-surface-container-low p-5">
            <p className="text-sm text-on-surface-variant">
              Bu sahne icin kullanilabilir secim bulunmuyor.
            </p>
            {currentScene ? (
              <button
                className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-50"
                data-testid="complete-story"
                disabled={submitting || checkpointSaving}
                onClick={() => void handleCompleteSession()}
                type="button"
              >
                {submitting ? "Tamamlanıyor..." : "Hikâyeyi Tamamla"}
              </button>
            ) : null}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-outline-variant bg-white p-6 md:p-8">
        <div className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px]">flag</span>
          Gorev listesi
        </div>
        {quests.length > 0 ? (
          <div className="mt-6 space-y-4">
            {quests.map((quest) => (
              <div
                key={quest.id}
                className="rounded-xl border border-outline-variant bg-surface-container-low p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-on-surface">
                    {quest.title}
                  </p>
                  <span className="inline-flex items-center rounded-full border border-outline-variant bg-white px-3 py-1 text-xs font-semibold text-on-surface-variant">
                    {quest.statusLabel}
                  </span>
                </div>
                {quest.summary ? (
                  <p className="mt-2 text-sm text-on-surface-variant">
                    {quest.summary}
                  </p>
                ) : null}
                <div className="mt-3 space-y-2">
                  {quest.objectives.map((objective) => (
                    <div
                      key={objective.index}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span
                        className={
                          objective.status === "completed"
                            ? "material-symbols-outlined text-[16px] text-primary"
                            : "material-symbols-outlined text-[16px] text-on-surface-variant"
                        }
                      >
                        {objective.status === "completed"
                          ? "check_circle"
                          : "radio_button_unchecked"}
                      </span>
                      <span className="flex-1 text-on-surface">
                        {objective.title}
                      </span>
                      <span className="text-xs text-on-surface-variant">
                        {objective.statusLabel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-on-surface-variant">
            Bu oturumda aktif gorev bulunmuyor.
          </p>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-outline-variant bg-white p-6 md:p-8">
        <div className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px]">history</span>
          Secim gecmisi
        </div>
        {choiceHistory.length > 0 ? (
          <div className="mt-6 space-y-3">
            {choiceHistory.map((entry, index) => (
              <div
                key={entry.id}
                className="rounded-xl border border-outline-variant bg-surface-container-low p-4"
              >
                <p className="text-sm font-semibold text-on-surface">
                  Secim {index + 1}
                </p>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Point: {entry.choicePointId}
                </p>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Option: {entry.optionId}
                </p>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Zaman: {entry.committedAt}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-on-surface-variant">
            Bu oturumda henuz commit edilmis secim yok.
          </p>
        )}
      </section>
    </main>
  );
}

function getHintTexts(option: ReaderOption): string[] {
  const previews = Array.isArray(option.option.consequencePreviews)
    ? option.option.consequencePreviews
    : [];

  return previews
    .map((preview) => {
      if (!preview || typeof preview !== "object") {
        return null;
      }

      const previewText = (preview as { previewText?: unknown }).previewText;
      if (typeof previewText !== "string") {
        return null;
      }

      const trimmedText = previewText.trim();
      return trimmedText.length > 0 ? trimmedText : null;
    })
    .filter((value): value is string => value !== null);
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-on-surface">{value}</p>
    </div>
  );
}
