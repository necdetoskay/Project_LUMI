"use client";

import { useEffect, useMemo, useState } from "react";

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

const shell: React.CSSProperties = {
  maxWidth: 1180,
  margin: "0 auto",
  padding: "28px 20px 72px",
  color: "#e9eaf3",
};

const panel: React.CSSProperties = {
  background: "#111526",
  border: "1px solid #252b46",
  borderRadius: 16,
  padding: 20,
};

const input: React.CSSProperties = {
  width: "100%",
  marginTop: 6,
  padding: "11px 12px",
  borderRadius: 10,
  border: "1px solid #303858",
  background: "#0b0f1d",
  color: "#f7f7fb",
};

const primaryButton: React.CSSProperties = {
  padding: "11px 16px",
  borderRadius: 10,
  border: 0,
  background: "#6f4cff",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  ...primaryButton,
  background: "#202842",
};

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
    throw new Error(payload.message ?? payload.error ?? "Test Lab isteği başarısız.");
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
    () => phases.filter((phase) => phase.testable && supportedIds.includes(phase.id)),
    [phases, supportedIds],
  );

  const currentIndex = runnablePhases.findIndex((phase) => phase.id === phaseId);
  const currentPhase = currentIndex >= 0 ? runnablePhases[currentIndex] : null;

  async function createSession() {
    if (!householdId.trim() || !childProfileId.trim() || !modelSlug.trim()) {
      setMessage("Household ID, Child Profile ID ve model bilgisi gerekli.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const initialState = JSON.parse(initialStateText) as Record<string, unknown>;
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
      setMessage("Test oturumu hazır. İlk onboarding aşamasını çalıştırabilirsiniz.");
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
      setMessage(`${nextResult.candidates.length} aday üretildi. Birini seçerek sonraki aşamaya geçin.`);
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
    <main style={shell}>
      <header style={{ marginBottom: 22 }}>
        <p style={{ opacity: 0.65, margin: 0 }}>Settings / Test Lab</p>
        <h1 style={{ margin: "8px 0", fontSize: 34 }}>Karakter Onboarding Test Lab</h1>
        <p style={{ maxWidth: 820, opacity: 0.8, lineHeight: 1.6 }}>
          Amaç: onboarding üretim aşamalarını gerçek production LLM yoluyla sırayla test etmek,
          her aşamada çıkan adaylardan birini seçmek ve seçilen state ile bir sonraki aşamaya geçmek.
        </p>
      </header>

      <section style={{ ...panel, marginBottom: 18 }}>
        <h2 style={{ marginTop: 0 }}>1. Test ayarları</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 14 }}>
          <label>
            OpenRouter model slug
            <input style={input} value={modelSlug} onChange={(event) => setModelSlug(event.target.value)} />
          </label>
          <label>
            Household ID
            <input style={input} value={householdId} onChange={(event) => setHouseholdId(event.target.value)} />
          </label>
          <label>
            Child Profile ID
            <input style={input} value={childProfileId} onChange={(event) => setChildProfileId(event.target.value)} />
          </label>
        </div>
        <details style={{ marginTop: 14 }}>
          <summary style={{ cursor: "pointer", opacity: 0.8 }}>Gelişmiş: başlangıç sandbox state</summary>
          <textarea
            rows={9}
            style={{ ...input, fontFamily: "monospace", resize: "vertical" }}
            value={initialStateText}
            onChange={(event) => setInitialStateText(event.target.value)}
          />
        </details>
        <button
          type="button"
          style={{ ...primaryButton, marginTop: 16, opacity: busy ? 0.6 : 1 }}
          disabled={busy}
          onClick={createSession}
        >
          {sessionId ? "Test oturumunu sıfırla" : "Test oturumu oluştur"}
        </button>
      </section>

      <section style={{ ...panel, marginBottom: 18 }}>
        <h2 style={{ marginTop: 0 }}>2. Onboarding aşamaları</h2>
        <p style={{ opacity: 0.7 }}>
          API şu anda {runnablePhases.length} production-backed üretim aşamasını doğrudan çalıştırabiliyor.
          Desteklenmeyen aşamalar açıkça pasif gösterilir; sahte test olarak sayılmaz.
        </p>
        <div style={{ display: "grid", gap: 9 }}>
          {phases.map((phase, index) => {
            const supported = phase.testable && supportedIds.includes(phase.id);
            const completed = completedIds.includes(phase.id);
            const active = phase.id === phaseId;
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
                style={{
                  textAlign: "left",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: active ? "1px solid #765cff" : "1px solid #2a3150",
                  background: active ? "#1a1834" : "#0c1120",
                  color: supported ? "#f2f2f7" : "#777f98",
                  cursor: supported ? "pointer" : "not-allowed",
                }}
              >
                <strong>{index + 1}. {phase.label}</strong>
                <span style={{ float: "right", fontSize: 13, opacity: 0.75 }}>
                  {completed ? "✓ tamamlandı" : supported ? (active ? "şimdi" : "hazır") : "backend desteği yok"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section style={panel}>
        <h2 style={{ marginTop: 0 }}>3. Aşamayı çalıştır</h2>
        <p style={{ fontSize: 18 }}>
          {currentPhase ? <><strong>{currentIndex + 1}. {currentPhase.label}</strong><br /><span style={{ opacity: 0.7 }}>{currentPhase.productionOperation}</span></> : "Çalıştırılabilir aşama seçili değil."}
        </p>
        <button
          type="button"
          style={{ ...primaryButton, opacity: !sessionId || busy ? 0.6 : 1 }}
          disabled={!sessionId || !currentPhase || busy}
          onClick={runCurrentPhase}
        >
          {busy ? "Çalışıyor..." : `${currentPhase?.label ?? "Aşama"} testini çalıştır`}
        </button>

        {result ? (
          <div style={{ marginTop: 22 }}>
            <h3>Üretilen adaylar</h3>
            <div style={{ display: "grid", gap: 12 }}>
              {result.candidates.map((candidate, index) => (
                <article key={candidate.id} style={{ border: "1px solid #2d3555", borderRadius: 12, padding: 14, background: "#0b1020" }}>
                  <strong>Aday {index + 1}</strong>
                  <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 13, lineHeight: 1.5, opacity: 0.9 }}>
                    {JSON.stringify(candidate.payload, null, 2)}
                  </pre>
                  <button type="button" style={secondaryButton} disabled={busy} onClick={() => selectCandidate(candidate)}>
                    Bu adayı seç ve sonraki aşamaya geç
                  </button>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {message ? (
        <div role="status" style={{ marginTop: 16, padding: "12px 14px", borderRadius: 10, background: "#151c31", border: "1px solid #30395c" }}>
          {message}
        </div>
      ) : null}
    </main>
  );
}
