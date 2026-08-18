"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { PromptWorkspace } from "./prompt-workspace";

type ScenarioKey = "character_onboarding" | "story_generation";
type StoryLengthPreset = "short" | "medium" | "long" | "custom";

type Phase = {
  id: string;
  label: string;
  testable: boolean;
  productionOperation: string;
  requiredStateKeys: string[];
};

type StateDiff = {
  fromStateId: string;
  toStateId: string;
  addedKeys: string[];
  removedKeys: string[];
  changedKeys: string[];
};

type Candidate = {
  id: string;
  runId: string;
  ordinal: number;
  payload: Record<string, unknown>;
  candidateStateId: string;
  candidateState: Record<string, unknown>;
  stateDiff: StateDiff;
};

type ExecutionSnapshot = {
  productionOperation: string;
  generationConfig: Record<string, unknown> | null;
  promptKey: string | null;
  promptVersion: number | null;
  renderedPromptFingerprint: string | null;
  contextFingerprint: string | null;
  promptTemplateSnapshot: {
    system: string;
    user: string;
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

type TimelineEntry = {
  phaseId: string;
  runId: string;
  candidateId: string;
  fromStateId: string;
  toStateId: string;
  branchId: string;
  forked: boolean;
  stateDiff: StateDiff;
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

const DEFAULT_ONBOARDING_STATE = JSON.stringify(
  {
    characterType: { key: "fantastic" },
    universe: { key: "new_world" },
  },
  null,
  2,
);

const DEFAULT_STORY_STATE = JSON.stringify(
  {
    character: { name: "Lumi", mood: "curious" },
    world: { region: "Crystal Caves" },
    inventory: [],
    relationships: {},
    memories: [],
    npcs: {},
    storyLab: {
      worldId: "replace-with-world-id",
      sourceFamily: "world_event",
      sourceTitle: "A new mystery appears",
      sourceTeaser: "A gentle change in the world invites exploration.",
      characterId: "replace-with-character-id",
      sourceNpcIds: [],
      stories: [],
      ageGuidance: [],
      playerKnownFacts: [],
      worldFacts: [],
    },
  },
  null,
  2,
);

export default function TestLabClient() {
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>(
    "character_onboarding",
  );
  const [onboardingPhases, setOnboardingPhases] = useState<Phase[]>([]);
  const [storyPhases, setStoryPhases] = useState<Phase[]>([]);
  const [supported, setSupported] = useState<string[]>([]);
  const [householdId, setHouseholdId] = useState("");
  const [childProfileId, setChildProfileId] = useState("");
  const [modelSlug, setModelSlug] = useState("deepseek/deepseek-chat-v3.1");
  const [initialStateText, setInitialStateText] = useState(
    DEFAULT_ONBOARDING_STATE,
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
  const [storyLengthPreset, setStoryLengthPreset] =
    useState<StoryLengthPreset>("medium");
  const [customMinCharacters, setCustomMinCharacters] = useState(1500);
  const [customMaxCharacters, setCustomMaxCharacters] = useState(2000);
  const [result, setResult] = useState<RunResult | null>(null);
  const [runHistory, setRunHistory] = useState<RunResult[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings/test-lab")
      .then((response) => response.json())
      .then((payload) => {
        setOnboardingPhases(
          payload.data?.scenarios?.characterOnboarding?.phases ??
            payload.data?.scenario?.phases ??
            [],
        );
        setStoryPhases(payload.data?.scenarios?.storyGeneration?.phases ?? []);
        setSupported(payload.data?.productionBackedPhaseIds ?? []);
      })
      .catch(() => setMessage("Test Lab metadata yüklenemedi."));
  }, []);

  const runnablePhases = useMemo(() => {
    if (scenarioKey === "story_generation") {
      return storyPhases.filter((phase) => phase.testable);
    }
    return onboardingPhases.filter(
      (phase) => phase.testable && supported.includes(phase.id),
    );
  }, [onboardingPhases, scenarioKey, storyPhases, supported]);

  const promptKey =
    scenarioKey === "character_onboarding"
      ? (PHASE_PROMPT_KEYS[phaseId] ?? null)
      : null;
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

  function changeScenario(nextScenario: ScenarioKey) {
    setScenarioKey(nextScenario);
    setInitialStateText(
      nextScenario === "story_generation"
        ? DEFAULT_STORY_STATE
        : DEFAULT_ONBOARDING_STATE,
    );
    setPhaseId(
      nextScenario === "story_generation"
        ? "story_001"
        : "character_first_identity_suggestions",
    );
    setPromptVersionOverride(undefined);
    setSessionId("");
    setBranchId("");
    setParentStateId("");
    setResult(null);
    setRunHistory([]);
    setTimeline([]);
    setSelectedCandidateId("");
    setMessage("");
  }

  async function createSession() {
    if (!householdId.trim() || !childProfileId.trim()) {
      setMessage("Household ID ve Child Profile ID gerekli.");
      return;
    }
    setBusy(true);
    setMessage("");
    setResult(null);
    setRunHistory([]);
    setTimeline([]);
    setSelectedCandidateId("");
    try {
      const initialState = JSON.parse(initialStateText) as Record<
        string,
        unknown
      >;
      const payload = await post({
        action: "create-session",
        scenarioKey,
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
      const generationConfig =
        scenarioKey === "story_generation"
          ? {
              narrativeTarget: {
                preset: storyLengthPreset,
                ...(storyLengthPreset === "custom"
                  ? {
                      minCharacters: customMinCharacters,
                      maxCharacters: customMaxCharacters,
                    }
                  : {}),
              },
            }
          : undefined;
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
        ...(generationConfig ? { generationConfig } : {}),
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
      const alreadySelected = timeline.some(
        (entry) => entry.branchId === branchId && entry.phaseId === phaseId,
      );
      const payload = await post({
        action: "select-candidate",
        sessionId,
        branchId,
        phaseId,
        runId: result.run.id,
        candidateId: candidate.id,
        ...(alreadySelected ? { forkBranchId: crypto.randomUUID() } : {}),
      });
      const nextBranchId = payload.data.activeBranchId as string;
      setSelectedCandidateId(candidate.id);
      setBranchId(nextBranchId);
      setParentStateId(payload.data.selection.selectedStateId);
      setTimeline((previous) => [
        ...previous,
        {
          phaseId,
          runId: result.run.id,
          candidateId: candidate.id,
          fromStateId: result.run.parentStateId,
          toStateId: payload.data.selection.selectedStateId,
          branchId: nextBranchId,
          forked: Boolean(payload.data.forked),
          stateDiff: candidate.stateDiff,
        },
      ]);
      if (scenarioKey === "story_generation") {
        const currentIndex = runnablePhases.findIndex(
          (phase) => phase.id === phaseId,
        );
        const nextPhase = runnablePhases[currentIndex + 1];
        if (nextPhase) setPhaseId(nextPhase.id);
      }
      setMessage(
        payload.data.forked
          ? "Yeni branch oluşturuldu. Eski downstream geçmiş korundu; sonraki story yalnız yeni seçimi kullanacak."
          : "Candidate sandbox state olarak seçildi. Sonraki phase yalnız bu state'i kullanacak.",
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
            Production generation yollarını sandbox state üzerinde çalıştırır.
            Candidate&apos;lar izoledir; yalnız açıkça seçilen candidate sonraki
            aşamanın parent state&apos;i olur.
          </p>
        </div>
        <Link href="/app/settings">LLM Ayarlarına dön</Link>
      </div>

      <section style={panelStyle}>
        <h2>1. Sandbox Session</h2>
        <div style={gridStyle}>
          <label>
            Scenario
            <select
              value={scenarioKey}
              onChange={(event) =>
                changeScenario(event.target.value as ScenarioKey)
              }
              style={inputStyle}
            >
              <option value="character_onboarding">Character Onboarding</option>
              <option value="story_generation">
                Stateful Story Generation
              </option>
            </select>
          </label>
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
            rows={12}
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
            {JSON.stringify(
              { scenarioKey, sessionId, branchId, parentStateId },
              null,
              2,
            )}
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

        {scenarioKey === "story_generation" ? (
          <div style={{ ...gridStyle, marginTop: 16 }}>
            <label>
              Story length
              <select
                value={storyLengthPreset}
                onChange={(event) =>
                  setStoryLengthPreset(event.target.value as StoryLengthPreset)
                }
                style={inputStyle}
              >
                <option value="short">Short · 900–1300</option>
                <option value="medium">Medium · 1500–2000</option>
                <option value="long">Long · 2500–3500</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            {storyLengthPreset === "custom" ? (
              <>
                <label>
                  Minimum characters
                  <input
                    type="number"
                    min={600}
                    value={customMinCharacters}
                    onChange={(event) =>
                      setCustomMinCharacters(Number(event.target.value))
                    }
                    style={inputStyle}
                  />
                </label>
                <label>
                  Maximum characters
                  <input
                    type="number"
                    min={600}
                    value={customMaxCharacters}
                    onChange={(event) =>
                      setCustomMaxCharacters(Number(event.target.value))
                    }
                    style={inputStyle}
                  />
                </label>
              </>
            ) : null}
          </div>
        ) : null}
      </section>

      {scenarioKey === "character_onboarding" ? (
        <PromptWorkspace
          householdId={householdId}
          promptKey={promptKey}
          promptVersionOverride={promptVersionOverride}
          onPromptVersionOverrideChange={setPromptVersionOverride}
        />
      ) : null}

      <section style={panelStyle}>
        <h2>3. Run</h2>
        <p style={{ opacity: 0.75 }}>
          {scenarioKey === "story_generation"
            ? `Production Story + Context Assembly kullanılacak. Length: ${storyLengthPreset}. Canonical story DB mutate edilmez.`
            : promptVersionOverride === undefined
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

      {timeline.length > 0 ? (
        <section style={panelStyle}>
          <h2>4. Selected-State Timeline</h2>
          <p style={{ opacity: 0.75 }}>
            Yalnız seçilmiş state geçişleri aktif lineage&apos;ı ilerletir. Fork
            yapılan geçmiş silinmez.
          </p>
          <div style={{ display: "grid", gap: 12 }}>
            {timeline.map((entry, index) => (
              <article key={`${entry.branchId}:${entry.runId}:${index}`}>
                <strong>
                  {entry.phaseId} · {entry.forked ? "fork" : "selected"}
                </strong>
                <pre style={metaStyle}>
                  {JSON.stringify(
                    {
                      branchId: entry.branchId,
                      runId: entry.runId,
                      candidateId: entry.candidateId,
                      fromStateId: entry.fromStateId,
                      toStateId: entry.toStateId,
                      diff: entry.stateDiff,
                    },
                    null,
                    2,
                  )}
                </pre>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {result ? (
        <>
          <section style={panelStyle}>
            <h2>5. Run Inspection</h2>
            <pre style={metaStyle}>
              {JSON.stringify(
                {
                  runId: result.run.id,
                  phaseId: result.run.phaseId,
                  parentStateId: result.run.parentStateId,
                  model: result.run.modelSlug,
                  generationConfig:
                    result.run.executionSnapshot?.generationConfig,
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
              <h2>6. Comparable Runs</h2>
              <p style={{ opacity: 0.75 }}>
                Aynı phase, parent state ve model ile yapılan bağımsız
                run&apos;lar.
              </p>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={cellStyle}>Run</th>
                      <th style={cellStyle}>Prompt</th>
                      <th style={cellStyle}>Length</th>
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
                          {entry.run.executionSnapshot?.promptVersion
                            ? `v${entry.run.executionSnapshot.promptVersion}`
                            : "production story"}
                        </td>
                        <td style={cellStyle}>
                          {JSON.stringify(
                            entry.run.executionSnapshot?.generationConfig ?? {},
                          )}
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
                <article
                  key={candidate.id}
                  style={{ ...panelStyle, margin: 0 }}
                >
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
                  <details>
                    <summary>Before / After State Diff</summary>
                    <pre style={metaStyle}>
                      {JSON.stringify(candidate.stateDiff, null, 2)}
                    </pre>
                  </details>
                  <details>
                    <summary>Candidate State Snapshot</summary>
                    <pre style={metaStyle}>
                      {JSON.stringify(candidate.candidateState, null, 2)}
                    </pre>
                  </details>
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
