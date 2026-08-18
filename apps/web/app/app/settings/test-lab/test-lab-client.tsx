"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { PromptWorkspace } from "./prompt-workspace";

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

type ExecutionSnapshot = {
  productionOperation: string;
  promptKey: string | null;
  promptVersion: number | null;
  renderedPromptFingerprint: string | null;
  contextFingerprint: string | null;
  promptTemplateSnapshot: {
    systemTemplate: string;
    userTemplate: string;
  } | null;
  renderedPrompt: { system: string; user: string } | null;
  finalProviderRequest: Record<string, unknown> | null;
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
    executionSnapshot: ExecutionSnapshot | null;
  };
  candidates: Candidate[];
  modelProfile: {
    displayName: string | null;
    pricing: { perMillionUsd: { prompt: number; completion: number } };
  };
};

const PHASE_PROMPT_KEYS: Record<string, string> = {
  character_first_identity_suggestions:
    "character_onboarding.character_first_identity_suggestions",
  world_suggestions: "character_onboarding.world_suggestions",
  compatibility: "character_onboarding.compatibility",
  region_suggestions: "character_onboarding.region_suggestions",
  origin_suggestions: "character_onboarding.character_origin_suggestions",
  core_saga: "character_onboarding.core_saga",
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
  const [promptVersionOverride, setPromptVersionOverride] = useState<
    number | undefined
  >(undefined);
  const [result, setResult] = useState<RunResult | null>(null);
  const [runHistory, setRunHistory] = useState<RunResult[]>([]);
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
  const promptKey = PHASE_PROMPT_KEYS[phaseId] ?? null;
  const comparableRuns = useMemo(
    () =>
      result
        ? runHistory.filter(
            (entry) =>
              entry.run.phaseId === result.run.phaseId &&
              entry.run.parentStateId === result.run.parentStateId &&
              entry.run.modelSlug === result.run.modelSlug,
          )
        : [],
    [result, runHistory],
  );

  async function createSession() {
    if (!householdId.trim() || !childProfileId.trim()) {
      setMessage("Household ID ve Child Profile ID gerekli.");
      return;
    }
    setBusy(true);
    setMessage("");
    setResult(null);
    setRunHistory([]);
    setSelectedCandidateId("");
    try {
      const initialState = JSON.parse(initialStateText) as Record<
        string,
        unknown
      >;
      const payload = await post({
        action: "create-session",
        initialState,
        householdId,
        childProfileId,
      });
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
        ...(promptVersionOverride === undefined
          ? {}
          : { promptVersionOverride }),
      });
      const nextResult = payload.data as RunResult;
      setResult(nextResult);
      setRunHistory((previous) => [...previous, nextResult]);
      const usedVersion = nextResult.run.executionSnapshot?.promptVersion;
      setMessage(
        `${nextResult.candidates.length} candidate üretildi${usedVersion ? ` (prompt v${usedVersion})` : ""}. Henüz hiçbiri sonraki state değil.`,
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
        <button
          disabled={busy || !householdId.trim() || !childProfileId.trim()}
          onClick={createSession}
          style={buttonStyle}
        >
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
            onChange={(event) => {
              setPhaseId(event.target.value);
              setPromptVersionOverride(undefined);
              setResult(null);
            }}
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
      </section>

      <PromptWorkspace
        householdId={householdId}
        promptKey={promptKey}
        promptVersionOverride={promptVersionOverride}
        onPromptVersionOverrideChange={setPromptVersionOverride}
      />

      <section style={panelStyle}>
        <h2>4. Run</h2>
        <p style={{ opacity: 0.75 }}>
          {promptVersionOverride === undefined
            ? "Production active prompt revision kullanılacak."
            : `Exact draft/revision v${promptVersionOverride} kullanılacak; production active prompt değişmeyecek.`}
        </p>
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
        <>
          <section style={panelStyle}>
            <h2>5. Run Inspection</h2>
            <pre style={metaStyle}>
              {JSON.stringify(
                {
                  runId: result.run.id,
                  parentStateId: result.run.parentStateId,
                  model: result.run.modelSlug,
                  usage: result.run.usageSnapshot,
                  fingerprints: {
                    renderedPrompt:
                      result.run.executionSnapshot?.renderedPromptFingerprint,
                    context: result.run.executionSnapshot?.contextFingerprint,
                  },
                  pricingPerMillionUsd:
                    result.modelProfile.pricing.perMillionUsd,
                },
                null,
                2,
              )}
            </pre>
            <ExecutionSnapshotInspector
              snapshot={result.run.executionSnapshot}
            />
          </section>

          {comparableRuns.length > 1 ? (
            <section style={panelStyle}>
              <h2>6. Active vs Draft / Revision Comparison</h2>
              <p style={{ opacity: 0.75 }}>
                Aynı phase, parent state ve model ile yapılan run&apos;lar. Böylece
                yalnız prompt revision etkisi karşılaştırılabilir.
              </p>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={cellStyle}>Run</th>
                      <th style={cellStyle}>Prompt</th>
                      <th style={cellStyle}>Input</th>
                      <th style={cellStyle}>Output</th>
                      <th style={cellStyle}>Cost</th>
                      <th style={cellStyle}>Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparableRuns.map((entry) => (
                      <tr key={entry.run.id}>
                        <td style={cellStyle}>{entry.run.id}</td>
                        <td style={cellStyle}>
                          v{entry.run.executionSnapshot?.promptVersion ?? "?"}
                        </td>
                        <td style={cellStyle}>
                          {entry.run.usageSnapshot?.promptTokens ?? "—"}
                        </td>
                        <td style={cellStyle}>
                          {entry.run.usageSnapshot?.completionTokens ?? "—"}
                        </td>
                        <td style={cellStyle}>
                          {entry.run.usageSnapshot?.actualCostUsd ??
                            entry.run.usageSnapshot?.estimatedCostUsd ??
                            "—"}
                        </td>
                        <td style={cellStyle}>
                          {entry.run.usageSnapshot?.latencyMs ?? "—"} ms
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <section style={panelStyle}>
            <h2>7. Candidates — Generate Many → Select One</h2>
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
        </>
      ) : null}
    </main>
  );
}

function ExecutionSnapshotInspector({
  snapshot,
}: {
  snapshot: ExecutionSnapshot | null;
}) {
  if (!snapshot) return <p>Execution snapshot yok.</p>;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <details open>
        <summary>Prompt Template</summary>
        <pre style={metaStyle}>
          {JSON.stringify(snapshot.promptTemplateSnapshot, null, 2)}
        </pre>
      </details>
      <details>
        <summary>Rendered Prompt</summary>
        <pre style={metaStyle}>
          {JSON.stringify(snapshot.renderedPrompt, null, 2)}
        </pre>
      </details>
      <details>
        <summary>Final Provider Request (sanitized)</summary>
        <pre style={metaStyle}>
          {JSON.stringify(snapshot.finalProviderRequest, null, 2)}
        </pre>
      </details>
    </div>
  );
}

async function post(body: Record<string, unknown>) {
  const response = await fetch("/api/settings/test-lab", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message ?? "Test Lab request failed");
  }
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

const cellStyle = {
  borderBottom: "1px solid rgba(127,127,127,.2)",
  padding: "8px 10px",
  textAlign: "left",
  verticalAlign: "top",
} as const;
