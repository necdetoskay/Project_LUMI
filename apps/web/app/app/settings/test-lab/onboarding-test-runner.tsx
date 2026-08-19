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
  candidateState: Record<string, unknown>;
};

type RunResult = {
  run: {
    id: string;
    phaseId: string;
    modelSlug: string | null;
  };
  candidates: Candidate[];
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

const DEFAULT_STATE = JSON.stringify(
  {
    characterType: { key: "fantastic" },
    universe: { key: "new_world" },
  },
  null,
  2,
);

const LAST_HOUSEHOLD_KEY = "lumi.testLab.householdId";
const LAST_CHILD_PROFILE_KEY = "lumi.testLab.childProfileId";
const LAST_MODEL_KEY = "lumi.testLab.modelSlug";
const LAST_LOCALE_KEY = "lumi.testLab.locale";

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
  const [initialStateText, setInitialStateText] = useState(DEFAULT_STATE);
  const [sessionId, setSessionId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [parentStateId, setParentStateId] = useState("");
  const [phaseId, setPhaseId] = useState("");
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [resultsByPhase, setResultsByPhase] = useState<
    Record<string, RunResult>
  >({});
  const [busy, setBusy] = useState(false);
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
  }, [householdId, childProfileId, modelSlug, locale]);

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
        const first = nextPhases.find(
          (phase: Phase) => phase.testable && nextSupported.includes(phase.id),
        );
        if (first) setPhaseId(first.id);
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
  const currentPhase = currentIndex >= 0 ? runnablePhases[currentIndex] : null;
  const currentResult = resultsByPhase[phaseId] ?? null;
  const currentPhaseCompleted = completedIds.includes(phaseId);
  const hasContext = Boolean(householdId && childProfileId);

  function resetSessionState() {
    setSessionId("");
    setBranchId("");
    setParentStateId("");
    setCompletedIds([]);
    setResultsByPhase({});
  }

  function changeHousehold(nextHouseholdId: string) {
    setHouseholdId(nextHouseholdId);
    const firstProfile = childProfiles.find(
      (profile) => profile.householdId === nextHouseholdId,
    );
    setChildProfileId(firstProfile?.id ?? "");
    resetSessionState();
  }

  async function createSession() {
    if (!householdId || !childProfileId || !modelSlug.trim()) {
      setMessage("Aile alanı, çocuk profili ve model seçimi gerekli.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const initialState = JSON.parse(initialStateText) as Record<
        string,
        unknown
      >;
      const payload = await post({
        action: "create-session",
        scenarioKey: "character_onboarding",
        initialState,
        householdId,
        childProfileId,
      });
      setSessionId(payload.data.session.id);
      setBranchId(payload.data.session.activeBranchId);
      setParentStateId(payload.data.initialState.id);
      setCompletedIds([]);
      setResultsByPhase({});
      const first = runnablePhases[0];
      if (first) setPhaseId(first.id);
      setMessage(
        "Test oturumu hazır. İlk onboarding aşamasını çalıştırabilirsiniz.",
      );
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function runCurrentPhase() {
    if (!sessionId || !branchId || !parentStateId || !phaseId) {
      setMessage("Önce test oturumu oluşturun.");
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
        generationConfig: { outputLocale: locale },
      });
      const nextResult = payload.data as RunResult;
      setResultsByPhase((previous) => ({
        ...previous,
        [phaseId]: nextResult,
      }));
      setMessage(
        `${nextResult.candidates.length} aday üretildi. Birini seçerek sonraki aşamaya geçin.`,
      );
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function selectCandidate(candidate: Candidate) {
    if (!currentResult || currentPhaseCompleted) return;
    setBusy(true);
    setMessage("");
    try {
      const payload = await post({
        action: "select-candidate",
        sessionId,
        branchId,
        phaseId,
        runId: currentResult.run.id,
        candidateId: candidate.id,
      });
      setBranchId(payload.data.activeBranchId);
      setParentStateId(payload.data.selection.selectedStateId);
      setCompletedIds((previous) =>
        previous.includes(phaseId) ? previous : [...previous, phaseId],
      );
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
          Amaç: onboarding üretim aşamalarını gerçek production LLM yoluyla
          sırayla test etmek, her aşamada çıkan adaylardan birini seçmek ve
          seçilen state ile bir sonraki aşamaya geçmek.
        </p>
      </header>

      <section className={styles.panel}>
        <h2>1. Test ayarları</h2>
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
          {sessionId ? "Test oturumunu sıfırla" : "Test oturumu oluştur"}
        </button>
      </section>

      <section className={styles.panel}>
        <h2>2. Onboarding aşamaları</h2>
        <p className={styles.muted}>
          API şu anda {runnablePhases.length} production-backed üretim aşamasını
          doğrudan çalıştırabiliyor. Desteklenmeyen aşamalar açıkça pasif
          gösterilir; sahte test olarak sayılmaz.
        </p>
        <div className={styles.phaseList}>
          {phases.map((phase, index) => {
            const supported = phase.testable && supportedIds.includes(phase.id);
            const completed = completedIds.includes(phase.id);
            const hasResult = Boolean(resultsByPhase[phase.id]);
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
                  {completed
                    ? "✓ tamamlandı — sonuçları gör"
                    : hasResult
                      ? "sonuç hazır"
                      : supported
                        ? active
                          ? "şimdi"
                          : "hazır"
                        : "backend desteği yok"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className={styles.panel}>
        <h2>3. Aşamayı çalıştır</h2>
        <p className={styles.currentPhase}>
          {currentPhase ? (
            <>
              <strong>
                {currentIndex + 1}. {currentPhase.label}
              </strong>
              <br />
              <span className={styles.operation}>
                {currentPhase.productionOperation}
              </span>
            </>
          ) : (
            "Çalıştırılabilir aşama seçili değil."
          )}
        </p>
        <button
          type="button"
          className={styles.primaryButton}
          disabled={!sessionId || !currentPhase || busy || currentPhaseCompleted}
          onClick={runCurrentPhase}
        >
          {busy
            ? "Çalışıyor..."
            : currentPhaseCompleted
              ? "Bu aşama tamamlandı"
              : `${currentPhase?.label ?? "Aşama"} testini çalıştır`}
        </button>

        {currentResult ? (
          <div className={styles.results}>
            <h3>
              Üretilen adaylar — {currentPhase?.label ?? currentResult.run.phaseId}
            </h3>
            {currentPhaseCompleted ? (
              <p className={styles.muted}>
                Bu aşamanın sonuçları geçmişten gösteriliyor. Seçim tamamlandığı
                için state yeniden değiştirilmez.
              </p>
            ) : null}
            <div className={styles.candidateList}>
              {currentResult.candidates.map((candidate, index) => (
                <article key={candidate.id} className={styles.candidate}>
                  <strong>Aday {index + 1}</strong>
                  <pre className={styles.payload}>
                    {JSON.stringify(candidate.payload, null, 2)}
                  </pre>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    disabled={busy || currentPhaseCompleted}
                    onClick={() => selectCandidate(candidate)}
                  >
                    {currentPhaseCompleted
                      ? "Aşama tamamlandı"
                      : "Bu adayı seç ve sonraki aşamaya geç"}
                  </button>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {message ? (
        <div role="status" className={styles.status}>
          {message}
        </div>
      ) : null}
    </main>
  );
}
