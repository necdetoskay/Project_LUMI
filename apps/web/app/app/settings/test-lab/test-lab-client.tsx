"use client";

import Link from "next/link";
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
};

type RunResult = {
  run: {
    id: string;
    phaseId: string;
    parentStateId: string;
    modelSlug: string | null;
    usageSnapshot: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      estimatedCostUsd: number;
      actualCostUsd: number | null;
      latencyMs: number;
    } | null;
    executionSnapshot: {
      promptKey: string | null;
      promptVersion: number | null;
      renderedPromptFingerprint: string | null;
      contextFingerprint: string | null;
    } | null;
  };
  candidates: Candidate[];
  modelProfile: {
    displayName: string | null;
    pricing: { perMillionUsd: { prompt: number; completion: number } };
  };
};

const DEFAULT_INITIAL_STATE = JSON.stringify(
  {
    characterType: { key: "fantastic" },
    universe: { key: "new_world" },
  },
  null,
  2,
);

export default function TestLabClient() {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [supported, setSupported] = useState<string[]>([]);
  const [householdId, setHouseholdId] = useState("");
  const [childProfileId, setChildProfileId] = useState("");
  const [modelSlug, setModelSlug] = useState("deepseek/deepseek-chat-v3.1");
  const [initialStateText, setInitialStateText] = useState(
    DEFAULT_INITIAL_STATE,
  );
  const [sessionId, setSessionId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [parentStateId, setParentStateId] = useState("");
  const [phaseId, setPhaseId] = useState(
    "character_first_identity_suggestions",
  );
  const [result, setResult] = useState<RunResult | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings/test-lab")
      .then((response) => response.json())
      .then((payload) => {
        setPhases(payload.data?.scenario?.phases ?? []);
        setSupported(payload.data?.productionBackedPhaseIds ?? []);
      })
      .catch(() => setMessage("Test Lab metadata yüklenemedi."));
  }, []);

  const runnablePhases = useMemo(
    () =>
      phases.filter((phase) => phase.testable && supported.includes(phase.id)),
    [phases, supported],
  );

  async function createSession() {
    setBusy(true);
    setMessage("");
    setResult(null);
    setSelectedCandidateId("");
    try {
      const initialState = JSON.parse(initialStateText) as Record<
        string,
        unknown
      >;
      const payload = await post({ action: "create-session", initialState });
      setSessionId(payload.data.session.id);
      setBranchId(payload.data.session.activeBranchId);
      setParentStateId(payload.data.initialState.id);
      setMessage("Sandbox session oluşturuldu. Production verisi değişmedi.");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function runPhase() {
    if (!sessionId || !branchId || !parentStateId) {
      setMessage("Önce sandbox session oluşturun.");
      return;
    }
    setBusy(true);
    setMessage("");
    setSelectedCandidateId("");
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
      setResult(payload.data);
      setMessage(
        `${payload.data.candidates.length} candidate üretildi. Henüz hiçbiri sonraki state değil.`,
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
      setSelectedCandidateId(candidate.id);
      setBranchId(payload.data.activeBranchId);
      setParentStateId(payload.data.selection.selectedStateId);
      setMessage(
        "Candidate canonical sandbox state olarak seçildi. Sonraki phase yalnız bu state'i kullanacak.",
      );
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 20px 64px" }}
    >
      <div
        style={{ display: "flex", justifyContent: "space-between", gap: 16 }}
      >
        <div>
          <p style={{ margin: 0, opacity: 0.65 }}>Settings / Developer</p>
          <h1 style={{ margin: "8px 0" }}>LUMI Test Lab</h1>
          <p style={{ maxWidth: 760, opacity: 0.8 }}>
            Real production Character Onboarding generation path. Her run izole
            candidate state üretir; yalnız “Sonraki aşamada kullan” seçimi
            sandbox zincirini ilerletir.
          </p>
        </div>
        <Link href="/app/settings">LLM Ayarlarına dön</Link>
      </div>

      <section style={panelStyle}>
        <h2>1. Sandbox Session</h2>
        <div style={gridStyle}>
          <label>
            Household ID
            <input
              value={householdId}
              onChange={(event) => setHouseholdId(event.target.value)}
              style={inputStyle}
            />
          </label>
          <label>
            Child Profile ID
            <input
              value={childProfileId}
              onChange={(event) => setChildProfileId(event.target.value)}
              style={inputStyle}
            />
          </label>
          <label>
            OpenRouter model slug
            <input
              value={modelSlug}
              onChange={(event) => setModelSlug(event.target.value)}
              style={inputStyle}
            />
          </label>
        </div>
        <label style={{ display: "block", marginTop: 16 }}>
          Initial sandbox state
          <textarea
            rows={9}
            value={initialStateText}
            onChange={(event) => setInitialStateText(event.target.value)}
            style={{
              ...inputStyle,
              fontFamily: "monospace",
              resize: "vertical",
            }}
          />
        </label>
        <button disabled={busy} onClick={createSession} style={buttonStyle}>
          Yeni sandbox session oluştur
        </button>
        {sessionId ? (
          <pre style={metaStyle}>
            {JSON.stringify({ sessionId, branchId, parentStateId }, null, 2)}
          </pre>
        ) : null}
      </section>

      <section style={panelStyle}>
        <h2>2. Production Phase</h2>
        <label>
          Phase
          <select
            value={phaseId}
            onChange={(event) => setPhaseId(event.target.value)}
            style={inputStyle}
          >
            {runnablePhases.map((phase) => (
              <option key={phase.id} value={phase.id}>
                {phase.label} — requires:{" "}
                {phase.requiredStateKeys.join(", ") || "none"}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={busy || !sessionId}
          onClick={runPhase}
          style={buttonStyle}
        >
          Production pipeline ile çalıştır
        </button>
      </section>

      {message ? (
        <p style={{ ...panelStyle, borderStyle: "dashed" }}>{message}</p>
      ) : null}

      {result ? (
        <section style={panelStyle}>
          <h2>3. Candidates — Generate Many → Select One</h2>
          <pre style={metaStyle}>
            {JSON.stringify(
              {
                runId: result.run.id,
                parentStateId: result.run.parentStateId,
                model: result.run.modelSlug,
                usage: result.run.usageSnapshot,
                execution: result.run.executionSnapshot,
                pricingPerMillionUsd: result.modelProfile.pricing.perMillionUsd,
              },
              null,
              2,
            )}
          </pre>
          <div style={{ display: "grid", gap: 16 }}>
            {result.candidates.map((candidate) => (
              <article key={candidate.id} style={{ ...panelStyle, margin: 0 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <strong>Candidate #{candidate.ordinal + 1}</strong>
                  <span>{candidate.candidateStateId}</span>
                </div>
                <pre style={metaStyle}>
                  {JSON.stringify(candidate.payload, null, 2)}
                </pre>
                <button
                  disabled={busy || selectedCandidateId === candidate.id}
                  onClick={() => selectCandidate(candidate)}
                  style={buttonStyle}
                >
                  {selectedCandidateId === candidate.id
                    ? "Seçildi"
                    : "Sonraki aşamada kullan"}
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

async function post(body: Record<string, unknown>) {
  const response = await fetch("/api/settings/test-lab", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok)
    throw new Error(payload.message ?? "Test Lab request failed");
  return payload;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Beklenmeyen Test Lab hatası";
}

const panelStyle = {
  border: "1px solid rgba(127,127,127,.28)",
  borderRadius: 16,
  padding: 20,
  marginTop: 20,
} as const;

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 16,
} as const;

const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  marginTop: 6,
  borderRadius: 8,
  border: "1px solid rgba(127,127,127,.4)",
  background: "transparent",
  color: "inherit",
} as const;

const buttonStyle = {
  marginTop: 16,
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid rgba(127,127,127,.4)",
  cursor: "pointer",
} as const;

const metaStyle = {
  padding: 12,
  borderRadius: 8,
  overflowX: "auto",
  background: "rgba(127,127,127,.08)",
  fontSize: 12,
} as const;
