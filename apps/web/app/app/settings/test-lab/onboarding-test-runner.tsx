"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "./test-lab-runner.module.css";

type Phase = {
  id: string;
  label: string;
  testable: boolean;
  productionOperation: string;
  requiredStateKeys: string[];
};

type Candidate = {
  id: string;
  runId: string;
  ordinal: number;
  payload: Record<string, unknown>;
  candidateStateId: string;
  candidateState?: Record<string, unknown>;
};

type UsageSnapshot = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  actualCostUsd: number | null;
  upstreamInferenceCostUsd: number | null;
  latencyMs: number;
};

type ExecutionSnapshot = {
  promptKey: string | null;
  promptVersion: number | null;
  renderedPrompt: {
    system: string;
    user: string;
  } | null;
};

type RunRecord = {
  id: string;
  phaseId: string;
  modelSlug: string | null;
  createdAt: string;
  usageSnapshot: UsageSnapshot | null;
  executionSnapshot: ExecutionSnapshot | null;
};

type RunHistoryEntry = {
  run: RunRecord;
  candidates: Candidate[];
  selectedCandidateId: string | null;
  selectedStateId: string | null;
};

type PromptDraft = {
  promptKey: string;
  promptVersion: number;
  system: string;
  user: string;
};

type HouseholdOption = {
  id: string;
  label: string;
};

type ChildProfileOption = {
  id: string;
  householdId: string;
  displayName: string;
  ageBand?: string | null;
};

type OnboardingTestRunnerProps = {
  households: HouseholdOption[];
  childProfiles: ChildProfileOption[];
};

const CHARACTER_TYPE_PHASE_ID = "character_type";
const CHARACTER_TYPE_OPTIONS = [
  { key: "human", label: "İnsan" },
  { key: "animal", label: "Hayvan" },
  { key: "fantastic", label: "Fantastik" },
  { key: "synthetic", label: "Sentetik" },
] as const;
type CharacterTypeKey = (typeof CHARACTER_TYPE_OPTIONS)[number]["key"];

const DEFAULT_STATE = JSON.stringify(
  {
    universe: { key: "new_world" },
  },
  null,
  2,
);

const LAST_HOUSEHOLD_KEY = "lumi.testLab.householdId";
const LAST_CHILD_PROFILE_KEY = "lumi.testLab.childProfileId";
const LAST_MODEL_KEY = "lumi.testLab.modelSlug";
const LAST_LOCALE_KEY = "lumi.testLab.locale";
const LAST_CHARACTER_TYPE_KEY = "lumi.testLab.characterType";
const LAST_SESSION_KEY = "lumi.testLab.sessionId";
const LAST_BRANCH_KEY = "lumi.testLab.branchId";
const LAST_STATE_KEY = "lumi.testLab.parentStateId";
const LAST_SESSION_CONTEXT_KEY = "lumi.testLab.sessionContext";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Bilinmeyen hata";
}

async function post(body: Record<string, unknown>) {
  const response = await fetch("/api/settings/test-lab", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(
      payload.message ?? payload.error ?? "Test Lab isteği başarısız.",
    );
  }
  return payload;
}

function sessionContext(householdId: string, childProfileId: string) {
  return `${householdId}:${childProfileId}`;
}

function groupRuns(entries: RunHistoryEntry[]) {
  return entries.reduce<Record<string, RunHistoryEntry[]>>((acc, entry) => {
    const current = acc[entry.run.phaseId] ?? [];
    acc[entry.run.phaseId] = [...current, entry];
    return acc;
  }, {});
}

function formatCost(value: number | null | undefined) {
  if (typeof value !== "number") return "—";
  if (value === 0) return "$0.000000";
  if (value < 0.000001) return `${value.toExponential(2)}`;
  return `${value.toFixed(6)}`;
}

function runCost(usage: UsageSnapshot) {
  return usage.actualCostUsd ?? usage.estimatedCostUsd;
}

function summarizeUsage(entries: RunHistoryEntry[]) {
  return entries.reduce(
    (summary, entry) => {
      const usage = entry.run.usageSnapshot;
      if (!usage) return summary;
      summary.runCount += 1;
      summary.promptTokens += usage.promptTokens;
      summary.completionTokens += usage.completionTokens;
      summary.totalTokens += usage.totalTokens;
      summary.costUsd += runCost(usage);
      if (usage.actualCostUsd !== null) summary.actualCostRuns += 1;
      return summary;
    },
    {
      runCount: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      costUsd: 0,
      actualCostRuns: 0,
    },
  );
}

export default function OnboardingTestRunner({
  households,
  childProfiles,
}: OnboardingTestRunnerProps) {
  const defaultHouseholdId = households[0]?.id ?? "";
  const defaultChildProfileId =
    childProfiles.find((profile) => profile.householdId === defaultHouseholdId)
      ?.id ?? "";

  const [phases, setPhases] = useState<Phase[]>([]);
  const [supportedIds, setSupportedIds] = useState<string[]>([]);
  const [householdId, setHouseholdId] = useState(defaultHouseholdId);
  const [childProfileId, setChildProfileId] = useState(defaultChildProfileId);
  const [modelSlug, setModelSlug] = useState("deepseek/deepseek-v4-flash");
  const [locale, setLocale] = useState("tr");
  const [characterType, setCharacterType] =
    useState<CharacterTypeKey>("fantastic");
  const [initialStateText, setInitialStateText] = useState(DEFAULT_STATE);
  const [sessionId, setSessionId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [parentStateId, setParentStateId] = useState("");
  const [phaseId, setPhaseId] = useState("");
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [runsByPhase, setRunsByPhase] = useState<
    Record<string, RunHistoryEntry[]>
  >({});
  const [promptDrafts, setPromptDrafts] = useState<Record<string, PromptDraft>>(
    {},
  );
  const [busy, setBusy] = useState(false);
  const [promptBusy, setPromptBusy] = useState(false);
  const [message, setMessage] = useState("");

  const availableProfiles = useMemo(
    () =>
      childProfiles.filter((profile) => profile.householdId === householdId),
    [childProfiles, householdId],
  );

  useEffect(() => {
    const rememberedHouseholdId =
      window.localStorage.getItem(LAST_HOUSEHOLD_KEY);
    const rememberedChildProfileId = window.localStorage.getItem(
      LAST_CHILD_PROFILE_KEY,
    );
    const rememberedModelSlug = window.localStorage.getItem(LAST_MODEL_KEY);
    const rememberedLocale = window.localStorage.getItem(LAST_LOCALE_KEY);
    const rememberedCharacterType = window.localStorage.getItem(
      LAST_CHARACTER_TYPE_KEY,
    );

    const nextHouseholdId = households.some(
      (household) => household.id === rememberedHouseholdId,
    )
      ? (rememberedHouseholdId ?? defaultHouseholdId)
      : defaultHouseholdId;
    const nextProfiles = childProfiles.filter(
      (profile) => profile.householdId === nextHouseholdId,
    );
    const nextChildProfileId = nextProfiles.some(
      (profile) => profile.id === rememberedChildProfileId,
    )
      ? (rememberedChildProfileId ?? nextProfiles[0]?.id ?? "")
      : (nextProfiles[0]?.id ?? "");

    setHouseholdId(nextHouseholdId);
    setChildProfileId(nextChildProfileId);
    if (rememberedModelSlug?.trim()) setModelSlug(rememberedModelSlug);
    if (rememberedLocale === "tr" || rememberedLocale === "en") {
      setLocale(rememberedLocale);
    }
    if (
      CHARACTER_TYPE_OPTIONS.some(
        (option) => option.key === rememberedCharacterType,
      )
    ) {
      setCharacterType(rememberedCharacterType as CharacterTypeKey);
    }

    const storedContext = window.localStorage.getItem(LAST_SESSION_CONTEXT_KEY);
    if (storedContext === sessionContext(nextHouseholdId, nextChildProfileId)) {
      setSessionId(window.localStorage.getItem(LAST_SESSION_KEY) ?? "");
      setBranchId(window.localStorage.getItem(LAST_BRANCH_KEY) ?? "");
      setParentStateId(window.localStorage.getItem(LAST_STATE_KEY) ?? "");
    }
  }, [childProfiles, defaultHouseholdId, households]);

  useEffect(() => {
    if (householdId)
      window.localStorage.setItem(LAST_HOUSEHOLD_KEY, householdId);
    if (childProfileId) {
      window.localStorage.setItem(LAST_CHILD_PROFILE_KEY, childProfileId);
    }
    if (modelSlug.trim())
      window.localStorage.setItem(LAST_MODEL_KEY, modelSlug);
    window.localStorage.setItem(LAST_LOCALE_KEY, locale);
    window.localStorage.setItem(LAST_CHARACTER_TYPE_KEY, characterType);
  }, [householdId, childProfileId, modelSlug, locale, characterType]);

  useEffect(() => {
    fetch("/api/settings/test-lab")
      .then((response) => response.json())
      .then((payload) => {
        const nextPhases =
          payload.data?.scenarios?.characterOnboarding?.phases ??
          payload.data?.scenario?.phases ??
          [];
        const nextSupported = payload.data?.productionBackedPhaseIds ?? [];
        setPhases(nextPhases);
        setSupportedIds(nextSupported);
        const first =
          nextPhases.find(
            (phase: Phase) => phase.id === CHARACTER_TYPE_PHASE_ID,
          ) ??
          nextPhases.find(
            (phase: Phase) =>
              phase.testable && nextSupported.includes(phase.id),
          );
        if (first) setPhaseId((current) => current || first.id);
      })
      .catch(() => setMessage("Onboarding aşamaları yüklenemedi."));
  }, []);

  const runnablePhases = useMemo(
    () =>
      phases.filter(
        (phase) => phase.testable && supportedIds.includes(phase.id),
      ),
    [phases, supportedIds],
  );

  const currentIndex = runnablePhases.findIndex(
    (phase) => phase.id === phaseId,
  );
  const currentPhase = phases.find((phase) => phase.id === phaseId) ?? null;
  const currentIsCharacterType = phaseId === CHARACTER_TYPE_PHASE_ID;
  const currentRuns = runsByPhase[phaseId] ?? [];
  const currentUsageSummary = summarizeUsage(currentRuns);
  const currentDraft = promptDrafts[phaseId] ?? null;
  const currentPhaseCompleted = completedIds.includes(phaseId);
  const hasContext = Boolean(householdId && childProfileId);

  function clearPersistedSession() {
    window.localStorage.removeItem(LAST_SESSION_KEY);
    window.localStorage.removeItem(LAST_BRANCH_KEY);
    window.localStorage.removeItem(LAST_STATE_KEY);
    window.localStorage.removeItem(LAST_SESSION_CONTEXT_KEY);
  }

  function persistSession(next: {
    sessionId: string;
    branchId: string;
    parentStateId: string;
  }) {
    window.localStorage.setItem(LAST_SESSION_KEY, next.sessionId);
    window.localStorage.setItem(LAST_BRANCH_KEY, next.branchId);
    window.localStorage.setItem(LAST_STATE_KEY, next.parentStateId);
    window.localStorage.setItem(
      LAST_SESSION_CONTEXT_KEY,
      sessionContext(householdId, childProfileId),
    );
  }

  function resetSessionState() {
    setSessionId("");
    setBranchId("");
    setParentStateId("");
    setCompletedIds([]);
    setRunsByPhase({});
    setPromptDrafts({});
    clearPersistedSession();
  }

  function changeHousehold(nextHouseholdId: string) {
    setHouseholdId(nextHouseholdId);
    const firstProfile = childProfiles.find(
      (profile) => profile.householdId === nextHouseholdId,
    );
    setChildProfileId(firstProfile?.id ?? "");
    resetSessionState();
  }

  async function refreshHistory(activeSessionId = sessionId) {
    if (!activeSessionId || !householdId || !childProfileId) return;
    const payload = await post({
      action: "inspect-session",
      sessionId: activeSessionId,
      householdId,
      childProfileId,
    });
    const entries = (payload.data.runs ?? []) as RunHistoryEntry[];
    setRunsByPhase(groupRuns(entries));
    setCompletedIds(
      Array.from(
        new Set(
          entries
            .filter((entry) => Boolean(entry.selectedCandidateId))
            .map((entry) => entry.run.phaseId),
        ),
      ),
    );
  }

  useEffect(() => {
    if (!sessionId || !householdId || !childProfileId) return;
    refreshHistory().catch(() => {
      setMessage("Kayıtlı Test Lab run geçmişi yüklenemedi.");
    });
  }, [sessionId, householdId, childProfileId]);

  useEffect(() => {
    if (!sessionId || !parentStateId || !phaseId || !currentPhase) return;
    if (currentIsCharacterType) return;
    if (promptDrafts[phaseId]) return;

    const latestRun = currentRuns[currentRuns.length - 1];
    const renderedPrompt = latestRun?.run.executionSnapshot?.renderedPrompt;
    if (renderedPrompt) {
      setPromptDrafts((previous) => ({
        ...previous,
        [phaseId]: {
          promptKey: latestRun.run.executionSnapshot?.promptKey ?? "",
          promptVersion: latestRun.run.executionSnapshot?.promptVersion ?? 0,
          system: renderedPrompt.system,
          user: renderedPrompt.user,
        },
      }));
      return;
    }

    setPromptBusy(true);
    post({
      action: "preview-phase-prompt",
      sessionId,
      branchId,
      phaseId,
      parentStateId,
      modelSlug,
      householdId,
      childProfileId,
      locale,
    })
      .then((payload) => {
        setPromptDrafts((previous) => ({
          ...previous,
          [phaseId]: {
            promptKey: payload.data.promptKey,
            promptVersion: payload.data.promptVersion,
            system: payload.data.renderedPrompt.system,
            user: payload.data.renderedPrompt.user,
          },
        }));
      })
      .catch((error) => setMessage(errorMessage(error)))
      .finally(() => setPromptBusy(false));
  }, [
    branchId,
    childProfileId,
    currentPhase,
    currentIsCharacterType,
    currentRuns,
    householdId,
    locale,
    modelSlug,
    parentStateId,
    phaseId,
    promptDrafts,
    sessionId,
  ]);

  async function createSession() {
    if (!householdId || !childProfileId || !modelSlug.trim()) {
      setMessage("Aile alanı, çocuk profili ve model seçimi gerekli.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const parsedInitialState = JSON.parse(initialStateText) as Record<
        string,
        unknown
      >;
      const initialState = {
        ...parsedInitialState,
        characterType: { key: characterType },
      };
      const payload = await post({
        action: "create-session",
        scenarioKey: "character_onboarding",
        initialState,
        householdId,
        childProfileId,
      });
      const next = {
        sessionId: payload.data.session.id as string,
        branchId: payload.data.session.activeBranchId as string,
        parentStateId: payload.data.initialState.id as string,
      };
      setSessionId(next.sessionId);
      setBranchId(next.branchId);
      setParentStateId(next.parentStateId);
      setCompletedIds([]);
      setRunsByPhase({});
      setPromptDrafts({});
      persistSession(next);
      const first =
        phases.find((phase) => phase.id === CHARACTER_TYPE_PHASE_ID) ??
        runnablePhases[0];
      if (first) setPhaseId(first.id);
      setMessage(
        "Test oturumu hazır. Soldan bir onboarding aşaması seçebilirsiniz.",
      );
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function updatePromptDraft(field: "system" | "user", value: string) {
    if (!currentDraft) return;
    setPromptDrafts((previous) => ({
      ...previous,
      [phaseId]: {
        ...currentDraft,
        [field]: value,
      },
    }));
  }

  async function resetPromptPreview() {
    if (!sessionId || !currentPhase) return;
    setPromptBusy(true);
    setMessage("");
    try {
      const payload = await post({
        action: "preview-phase-prompt",
        sessionId,
        branchId,
        phaseId,
        parentStateId,
        modelSlug,
        householdId,
        childProfileId,
        locale,
      });
      setPromptDrafts((previous) => ({
        ...previous,
        [phaseId]: {
          promptKey: payload.data.promptKey,
          promptVersion: payload.data.promptVersion,
          system: payload.data.renderedPrompt.system,
          user: payload.data.renderedPrompt.user,
        },
      }));
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setPromptBusy(false);
    }
  }

  async function runCurrentPhase() {
    if (
      !sessionId ||
      !branchId ||
      !parentStateId ||
      !phaseId ||
      !currentDraft
    ) {
      setMessage("Önce test oturumu ve prompt önizlemesi hazır olmalı.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const payload = await post({
        action: "run-phase",
        sessionId,
        branchId,
        phaseId,
        parentStateId,
        modelSlug,
        householdId,
        childProfileId,
        generationConfig: {
          outputLocale: locale,
          promptOverride: {
            system: currentDraft.system,
            user: currentDraft.user,
          },
        },
      });
      await refreshHistory();
      setMessage(
        `${payload.data.candidates.length} aday üretildi. Aynı promptu değiştirilmiş haliyle tekrar çalıştırabilir veya bir aday seçebilirsiniz.`,
      );
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function selectCandidate(entry: RunHistoryEntry, candidate: Candidate) {
    if (currentPhaseCompleted) return;
    setBusy(true);
    setMessage("");
    try {
      const payload = await post({
        action: "select-candidate",
        sessionId,
        branchId,
        phaseId,
        runId: entry.run.id,
        candidateId: candidate.id,
      });
      const nextBranchId = payload.data.activeBranchId as string;
      const nextParentStateId = payload.data.selection
        .selectedStateId as string;
      setBranchId(nextBranchId);
      setParentStateId(nextParentStateId);
      persistSession({
        sessionId,
        branchId: nextBranchId,
        parentStateId: nextParentStateId,
      });
      await refreshHistory();
      const nextPhase = runnablePhases[currentIndex + 1];
      if (nextPhase) {
        setPhaseId(nextPhase.id);
        setMessage(`Aday seçildi. Sıradaki aşama: ${nextPhase.label}`);
      } else {
        setMessage("Production-backed onboarding test akışı tamamlandı.");
      }
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <p className={styles.breadcrumb}>Settings / Test Lab</p>
        <h1 className={styles.title}>Karakter Onboarding Test Lab</h1>
        <p className={styles.intro}>
          Her onboarding aşamasında production promptunu görün, sadece bu test
          runı için düzenleyin ve farklı promptlarla üretilen sonuçları aynı
          aşamada karşılaştırın.
        </p>
      </header>

      <section className={styles.panel}>
        <h2>Test ayarları</h2>
        <div className={styles.settingsGrid}>
          <label className={styles.field}>
            OpenRouter model slug
            <input
              className={styles.input}
              value={modelSlug}
              onChange={(event) => setModelSlug(event.target.value)}
            />
          </label>
          <label className={styles.field}>
            Karakter tipi
            <select
              className={styles.input}
              value={characterType}
              disabled={busy}
              onChange={(event) => {
                setCharacterType(event.target.value as CharacterTypeKey);
                resetSessionState();
                setPhaseId(CHARACTER_TYPE_PHASE_ID);
              }}
            >
              {CHARACTER_TYPE_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            Dil
            <select
              className={styles.input}
              value={locale}
              disabled={busy}
              onChange={(event) => {
                setLocale(event.target.value);
                resetSessionState();
              }}
            >
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className={styles.field}>
            Aile alanı
            <select
              className={styles.input}
              value={householdId}
              disabled={households.length === 0 || busy}
              onChange={(event) => changeHousehold(event.target.value)}
            >
              {households.length === 0 ? (
                <option value="">Kayıtlı aile alanı yok</option>
              ) : null}
              {households.map((household) => (
                <option key={household.id} value={household.id}>
                  {household.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            Çocuk profili
            <select
              className={styles.input}
              value={childProfileId}
              disabled={availableProfiles.length === 0 || busy}
              onChange={(event) => {
                setChildProfileId(event.target.value);
                resetSessionState();
              }}
            >
              {availableProfiles.length === 0 ? (
                <option value="">Kayıtlı çocuk profili yok</option>
              ) : null}
              {availableProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.displayName}
                  {profile.ageBand ? ` — ${profile.ageBand}` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        {!hasContext ? (
          <p className={styles.muted}>
            Test için önce bir aile alanı ve çocuk profili gerekiyor. UUID
            aramanıza gerek yok; kayıt oluşturduktan sonra bu listede otomatik
            görünecek. <a href="/app/onboarding">Profil verisini hazırla</a>
          </p>
        ) : null}

        <details className={styles.details}>
          <summary className={styles.summary}>
            Gelişmiş: başlangıç sandbox state
          </summary>
          <textarea
            rows={9}
            className={styles.textarea}
            value={initialStateText}
            onChange={(event) => setInitialStateText(event.target.value)}
          />
        </details>
        <button
          type="button"
          className={styles.primaryButton}
          disabled={busy || !hasContext || !modelSlug.trim()}
          onClick={createSession}
        >
          {sessionId ? "Yeni test oturumu başlat" : "Test oturumu oluştur"}
        </button>
      </section>

      <div className={styles.workspace}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h2>Onboarding aşamaları</h2>
            <p className={styles.muted}>
              {runnablePhases.length} LLM üretim aşaması
            </p>
          </div>
          <div className={styles.phaseList}>
            {phases.map((phase, index) => {
              const selectionPhase = phase.id === CHARACTER_TYPE_PHASE_ID;
              const supported =
                selectionPhase ||
                (phase.testable && supportedIds.includes(phase.id));
              const completed = completedIds.includes(phase.id);
              const runCount = runsByPhase[phase.id]?.length ?? 0;
              const active = phase.id === phaseId;
              const phaseClassName = [
                styles.phaseButton,
                active ? styles.phaseActive : "",
                !supported ? styles.phaseDisabled : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <button
                  key={phase.id}
                  type="button"
                  disabled={!supported || busy}
                  onClick={() => {
                    setPhaseId(phase.id);
                    setMessage("");
                  }}
                  className={phaseClassName}
                >
                  <strong>
                    {index + 1}. {phase.label}
                  </strong>
                  <span className={styles.phaseStatus}>
                    {selectionPhase
                      ? `seçim aşaması · ${
                          CHARACTER_TYPE_OPTIONS.find(
                            (option) => option.key === characterType,
                          )?.label ?? characterType
                        }`
                      : !supported
                        ? "Test Lab bağlantısı henüz yok"
                        : completed
                          ? `✓ tamamlandı · ${runCount} run`
                          : runCount > 0
                            ? `${runCount} run`
                            : active
                              ? "şimdi"
                              : "hazır"}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className={styles.contentPanel}>
          {currentPhase ? (
            <>
              <div className={styles.contentHeader}>
                <div>
                  <p className={styles.eyebrow}>Seçili test</p>
                  <h2>{currentPhase.label}</h2>
                  <p className={styles.operation}>
                    {currentPhase.productionOperation}
                  </p>
                </div>
                <span className={styles.runBadge}>
                  {currentRuns.length} run
                </span>
              </div>

              {!currentIsCharacterType && currentUsageSummary.runCount > 0 ? (
                <div
                  className={styles.metrics}
                  aria-label="Aşama kullanım özeti"
                >
                  <span>{currentUsageSummary.runCount} ücretli run</span>
                  <span>Input {currentUsageSummary.promptTokens} token</span>
                  <span>
                    Output {currentUsageSummary.completionTokens} token
                  </span>
                  <span>Toplam {currentUsageSummary.totalTokens} token</span>
                  <span>
                    {currentUsageSummary.actualCostRuns ===
                    currentUsageSummary.runCount
                      ? "Gerçek API"
                      : "API / tahmini"}{" "}
                    {formatCost(currentUsageSummary.costUsd)}
                  </span>
                </div>
              ) : null}

              {currentIsCharacterType ? (
                <section className={styles.promptCard}>
                  <h3>Karakter tipi seçimi</h3>
                  <p className={styles.muted}>
                    Bu aşama LLM çağrısı yapmaz. Seçilen tip yeni sandbox
                    oturumunun state&apos;ine yazılır ve sonraki üretim
                    promptlarına context olarak aktarılır.
                  </p>
                  <label className={styles.field}>
                    Karakter tipi
                    <select
                      className={styles.input}
                      value={characterType}
                      disabled={busy}
                      onChange={(event) => {
                        setCharacterType(
                          event.target.value as CharacterTypeKey,
                        );
                        resetSessionState();
                      }}
                    >
                      {CHARACTER_TYPE_OPTIONS.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className={styles.muted}>
                    Yeni seçimden sonra test oturumunu yeniden oluşturun.
                    Böylece Character Identity ve sonraki aşamalardaki promptlar
                    bu tipi kullanır.
                  </p>
                </section>
              ) : !sessionId ? (
                <div className={styles.emptyState}>
                  Promptu ve sonuçları görmek için önce test oturumu oluşturun.
                </div>
              ) : (
                <>
                  <section className={styles.promptCard}>
                    <div className={styles.promptHeader}>
                      <div>
                        <h3>LLM&apos;e gönderilecek prompt</h3>
                        <p className={styles.muted}>
                          {currentDraft
                            ? `${currentDraft.promptKey} · v${currentDraft.promptVersion}`
                            : "Prompt hazırlanıyor..."}
                        </p>
                      </div>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        disabled={promptBusy || busy}
                        onClick={resetPromptPreview}
                      >
                        Production promptunu geri yükle
                      </button>
                    </div>

                    <label className={styles.field}>
                      System prompt
                      <textarea
                        rows={6}
                        className={styles.promptTextarea}
                        value={currentDraft?.system ?? ""}
                        disabled={!currentDraft || promptBusy || busy}
                        onChange={(event) =>
                          updatePromptDraft("system", event.target.value)
                        }
                      />
                    </label>
                    <label className={styles.field}>
                      User prompt
                      <textarea
                        rows={14}
                        className={styles.promptTextarea}
                        value={currentDraft?.user ?? ""}
                        disabled={!currentDraft || promptBusy || busy}
                        onChange={(event) =>
                          updatePromptDraft("user", event.target.value)
                        }
                      />
                    </label>
                    <p className={styles.muted}>
                      Buradaki değişiklik yalnız yeni Test Lab runına uygulanır;
                      production prompt kaydı değiştirilmez.
                    </p>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      disabled={
                        busy ||
                        promptBusy ||
                        !currentDraft ||
                        currentPhaseCompleted
                      }
                      onClick={runCurrentPhase}
                    >
                      {busy
                        ? "Çalışıyor..."
                        : currentPhaseCompleted
                          ? "Bu aşama tamamlandı"
                          : "Bu prompt ile çalıştır"}
                    </button>
                  </section>

                  <section className={styles.historySection}>
                    <div className={styles.historyHeader}>
                      <h3>Run sonuçları</h3>
                      <span className={styles.muted}>
                        Her sonuç kendi prompt snapshotı ile saklanır.
                      </span>
                    </div>
                    {currentRuns.length === 0 ? (
                      <div className={styles.emptyState}>
                        Bu aşama henüz çalıştırılmadı.
                      </div>
                    ) : (
                      <div className={styles.runList}>
                        {[...currentRuns]
                          .reverse()
                          .map((entry, reverseIndex) => {
                            const runNumber = currentRuns.length - reverseIndex;
                            const usedPrompt =
                              entry.run.executionSnapshot?.renderedPrompt;
                            const usage = entry.run.usageSnapshot;
                            return (
                              <article
                                key={entry.run.id}
                                className={styles.runCard}
                              >
                                <div className={styles.runHeader}>
                                  <div>
                                    <strong>Run {runNumber}</strong>
                                    <p className={styles.runMeta}>
                                      {entry.run.modelSlug ??
                                        "model bilinmiyor"}{" "}
                                      ·{" "}
                                      {new Date(
                                        entry.run.createdAt,
                                      ).toLocaleString()}
                                    </p>
                                  </div>
                                  {entry.selectedCandidateId ? (
                                    <span className={styles.selectedBadge}>
                                      seçim yapıldı
                                    </span>
                                  ) : null}
                                </div>

                                {usage ? (
                                  <div
                                    className={styles.metrics}
                                    aria-label={`Run ${runNumber} token ve maliyet kullanımı`}
                                  >
                                    <span>
                                      Input {usage.promptTokens} token
                                    </span>
                                    <span>
                                      Output {usage.completionTokens} token
                                    </span>
                                    <span>
                                      Toplam {usage.totalTokens} token
                                    </span>
                                    <span>{usage.latencyMs} ms</span>
                                    <span>
                                      {usage.actualCostUsd !== null
                                        ? "Gerçek API"
                                        : "Tahmini"}{" "}
                                      {formatCost(runCost(usage))}
                                    </span>
                                  </div>
                                ) : null}

                                <details className={styles.runPrompt}>
                                  <summary>
                                    Bu run&apos;da kullanılan prompt
                                  </summary>
                                  <div className={styles.promptSnapshot}>
                                    <strong>System</strong>
                                    <pre>
                                      {usedPrompt?.system ??
                                        "Prompt snapshotı yok"}
                                    </pre>
                                    <strong>User</strong>
                                    <pre>
                                      {usedPrompt?.user ??
                                        "Prompt snapshotı yok"}
                                    </pre>
                                  </div>
                                </details>

                                <div className={styles.candidateList}>
                                  {entry.candidates.map((candidate, index) => (
                                    <article
                                      key={candidate.id}
                                      className={styles.candidate}
                                    >
                                      <strong>Aday {index + 1}</strong>
                                      <pre className={styles.payload}>
                                        {JSON.stringify(
                                          candidate.payload,
                                          null,
                                          2,
                                        )}
                                      </pre>
                                      <button
                                        type="button"
                                        className={styles.secondaryButton}
                                        disabled={
                                          busy ||
                                          currentPhaseCompleted ||
                                          Boolean(entry.selectedCandidateId)
                                        }
                                        onClick={() =>
                                          selectCandidate(entry, candidate)
                                        }
                                      >
                                        {candidate.id ===
                                        entry.selectedCandidateId
                                          ? "Seçilen aday"
                                          : currentPhaseCompleted
                                            ? "Aşama tamamlandı"
                                            : "Bu adayı seç ve sonraki aşamaya geç"}
                                      </button>
                                    </article>
                                  ))}
                                </div>
                              </article>
                            );
                          })}
                      </div>
                    )}
                  </section>
                </>
              )}
            </>
          ) : (
            <div className={styles.emptyState}>
              Soldan çalıştırılabilir bir onboarding aşaması seçin.
            </div>
          )}
        </section>
      </div>

      {message ? (
        <div role="status" className={styles.status}>
          {message}
        </div>
      ) : null}
    </main>
  );
}
