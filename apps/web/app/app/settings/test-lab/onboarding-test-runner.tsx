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

const DEFAULT_STATE = JSON.stringify(
  {
    characterType: { key: "fantastic" },
    universe: { key: "new_world" },
  },
  null,
  2,
);

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

export default function OnboardingTestRunner() {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [supportedIds, setSupportedIds] = useState<string[]>([]);
  const [householdId, setHouseholdId] = useState("");
  const [childProfileId, setChildProfileId] = useState("");
  const [modelSlug, setModelSlug] = useState("deepseek/deepseek-v4-flash");
  const [initialStateText, setInitialStateText] = useState(DEFAULT_STATE);
  const [sessionId, setSessionId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [parentStateId, setParentStateId] = useState("");
  const [phaseId, setPhaseId] = useState("");
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [result, setResult] = useState<RunResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

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

  async function createSession() {
    if (!householdId.trim() || !childProfileId.trim() || !modelSlug.trim()) {
      setMessage("Household ID, Child Profile ID ve model bilgisi gerekli.");
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
      setResult(null);
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
    setResult(null);
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
      });
      const nextResult = payload.data as RunResult;
      setResult(nextResult);
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
    if (!result) return;
    setBusy(true);
    setMessage("");
    try {
      const payload = await post({
        action: "select-candidate",
        sessionId,
        branchId,
        phaseId,
        runId: result.run.id,
        candidateId: candidate.id,
      });
      setBranchId(payload.data.activeBranchId);
      setParentStateId(payload.data.selection.selectedStateId);
      setCompletedIds((previous) =>
        previous.includes(phaseId) ? previous : [...previous, phaseId],
      );
      const nextPhase = runnablePhases[currentIndex + 1];
      setResult(null);
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
            Household ID
            <input
              className={styles.input}
              value={householdId}
              onChange={(event) => setHouseholdId(event.target.value)}
            />
          </label>
          <label className={styles.field}>
            Child Profile ID
            <input
              className={styles.input}
              value={childProfileId}
              onChange={(event) => setChildProfileId(event.target.value)}
            />
          </label>
        </div>
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
          disabled={busy}
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
                  setResult(null);
                  setMessage("");
                }}
                className={phaseClassName}
              >
                <strong>
                  {index + 1}. {phase.label}
                </strong>
                <span className={styles.phaseStatus}>
                  {completed
                    ? "✓ tamamlandı"
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
          disabled={!sessionId || !currentPhase || busy}
          onClick={runCurrentPhase}
        >
          {busy
            ? "Çalışıyor..."
            : `${currentPhase?.label ?? "Aşama"} testini çalıştır`}
        </button>

        {result ? (
          <div className={styles.results}>
            <h3>Üretilen adaylar</h3>
            <div className={styles.candidateList}>
              {result.candidates.map((candidate, index) => (
                <article key={candidate.id} className={styles.candidate}>
                  <strong>Aday {index + 1}</strong>
                  <pre className={styles.payload}>
                    {JSON.stringify(candidate.payload, null, 2)}
                  </pre>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    disabled={busy}
                    onClick={() => selectCandidate(candidate)}
                  >
                    Bu adayı seç ve sonraki aşamaya geç
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
