"use client";

import { useEffect, useState } from "react";

import styles from "./test-lab-runner.module.css";

const PHASE_ID = "character_genesis_environment";
const LAST_HOUSEHOLD_KEY = "lumi.testLab.householdId";
const LAST_CHILD_PROFILE_KEY = "lumi.testLab.childProfileId";
const LAST_MODEL_KEY = "lumi.testLab.modelSlug";
const LAST_LOCALE_KEY = "lumi.testLab.locale";
const LAST_SESSION_KEY = "lumi.testLab.sessionId";
const LAST_BRANCH_KEY = "lumi.testLab.branchId";
const LAST_STATE_KEY = "lumi.testLab.parentStateId";

type Candidate = {
  id: string;
  payload: Record<string, unknown>;
  candidateStateId: string;
};

type RunEntry = {
  run: {
    id: string;
    phaseId: string;
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
      renderedPrompt: { system: string; user: string } | null;
      rawProviderOutput?: string | null;
    } | null;
  };
  candidates: Candidate[];
  selectedCandidateId: string | null;
};

type PromptDraft = {
  promptKey: string;
  promptVersion: number;
  system: string;
  user: string;
};

async function post(path: string, body: Record<string, unknown>) {
  const response = await fetch(path, {
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

function sandboxContext() {
  return {
    householdId: window.localStorage.getItem(LAST_HOUSEHOLD_KEY) ?? "",
    childProfileId: window.localStorage.getItem(LAST_CHILD_PROFILE_KEY) ?? "",
    sessionId: window.localStorage.getItem(LAST_SESSION_KEY) ?? "",
    branchId: window.localStorage.getItem(LAST_BRANCH_KEY) ?? "",
    parentStateId: window.localStorage.getItem(LAST_STATE_KEY) ?? "",
  };
}

function formatCost(value: number | null | undefined) {
  if (typeof value !== "number") return "—";
  if (value === 0) return "$0.000000";
  if (value < 0.000001) return "$" + value.toExponential(2);
  return "$" + value.toFixed(6);
}

export default function EnvironmentGenesisTestPanel() {
  const [modelSlug, setModelSlug] = useState("deepseek/deepseek-v4-flash");
  const [locale, setLocale] = useState("tr");
  const [prompt, setPrompt] = useState<PromptDraft | null>(null);
  const [runs, setRuns] = useState<RunEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const rememberedModel = window.localStorage.getItem(LAST_MODEL_KEY);
    const rememberedLocale = window.localStorage.getItem(LAST_LOCALE_KEY);
    if (rememberedModel?.trim()) setModelSlug(rememberedModel);
    if (rememberedLocale?.trim()) setLocale(rememberedLocale);
    refreshHistory().catch(() => undefined);
  }, []);

  async function refreshHistory() {
    const context = sandboxContext();
    if (!context.sessionId || !context.householdId || !context.childProfileId) {
      setRuns([]);
      return;
    }
    const payload = await post("/api/settings/test-lab", {
      action: "inspect-session",
      sessionId: context.sessionId,
      householdId: context.householdId,
      childProfileId: context.childProfileId,
    });
    const history = (payload.data.runs ?? []) as RunEntry[];
    setRuns(history.filter((entry) => entry.run.phaseId === PHASE_ID));
  }

  async function previewPrompt() {
    const context = sandboxContext();
    if (!context.sessionId || !context.branchId || !context.parentStateId) {
      setMessage("Önce Memory Seeds & Origin Threads dahil önceki sandbox aşamalarını tamamlayın.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const payload = await post("/api/settings/test-lab/genesis/environment", {
        action: "preview",
        ...context,
        modelSlug,
        locale,
      });
      setPrompt({
        promptKey: payload.data.promptKey,
        promptVersion: payload.data.promptVersion,
        system: payload.data.renderedPrompt.system,
        user: payload.data.renderedPrompt.user,
      });
      setMessage("Initial World / Season State production promptu hazırlandı.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Prompt hazırlanamadı.");
    } finally {
      setBusy(false);
    }
  }

  async function runEnvironment() {
    const context = sandboxContext();
    if (!prompt || !context.sessionId || !context.branchId || !context.parentStateId) {
      setMessage("Önce production promptunu yükleyin.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const payload = await post("/api/settings/test-lab/genesis/environment", {
        action: "run",
        ...context,
        modelSlug,
        locale,
        promptOverride: { system: prompt.system, user: prompt.user },
      });
      await refreshHistory();
      setMessage(
        `${payload.data.candidates.length} environment adayı üretildi; canonical resolution, compatibility validation, decision trace ve context projection kaydedildi.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Environment Genesis çalıştırılamadı.");
    } finally {
      setBusy(false);
    }
  }

  async function selectCandidate(entry: RunEntry, candidate: Candidate) {
    const context = sandboxContext();
    setBusy(true);
    setMessage("");
    try {
      const payload = await post("/api/settings/test-lab", {
        action: "select-candidate",
        sessionId: context.sessionId,
        branchId: context.branchId,
        phaseId: PHASE_ID,
        runId: entry.run.id,
        candidateId: candidate.id,
      });
      window.localStorage.setItem(LAST_BRANCH_KEY, payload.data.activeBranchId as string);
      window.localStorage.setItem(
        LAST_STATE_KEY,
        payload.data.selection.selectedStateId as string,
      );
      await refreshHistory();
      setMessage("Environment adayı sandbox state için seçildi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Aday seçilemedi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.shell} aria-label="Environment Genesis Test Lab">
      <section className={styles.panel}>
        <p className={styles.eyebrow}>Character Genesis</p>
        <h2>Initial World / Season State</h2>
        <p className={styles.muted}>
          Habitat ve climate gibi kalıcı çevresel gerçekleri season, weather,
          day phase ve local conditions gibi geçici state&apos;ten ayırır. Custom
          fantasy season semantics, priority decision trace ve explicit anomaly
          provenance görünürdür.
        </p>
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
              onChange={(event) => setLocale(event.target.value)}
            >
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
            </select>
          </label>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={busy}
            onClick={previewPrompt}
          >
            Production promptunu yükle
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={busy || !prompt}
            onClick={runEnvironment}
          >
            Environment Genesis çalıştır
          </button>
        </div>
        {prompt ? (
          <div className={styles.stack}>
            <label className={styles.field}>
              System prompt
              <textarea
                className={styles.textarea}
                rows={8}
                value={prompt.system}
                onChange={(event) => setPrompt({ ...prompt, system: event.target.value })}
              />
            </label>
            <label className={styles.field}>
              User prompt
              <textarea
                className={styles.textarea}
                rows={12}
                value={prompt.user}
                onChange={(event) => setPrompt({ ...prompt, user: event.target.value })}
              />
            </label>
          </div>
        ) : null}
        {message ? <p className={styles.muted}>{message}</p> : null}
      </section>

      {runs.map((entry) => {
        const usage = entry.run.usageSnapshot;
        return (
          <section className={styles.panel} key={entry.run.id}>
            <h3>Run {entry.run.id.slice(0, 8)}</h3>
            {usage ? (
              <p className={styles.muted}>
                Input {usage.promptTokens} token · Output {usage.completionTokens} token · Toplam {usage.totalTokens} · {formatCost(usage.actualCostUsd ?? usage.estimatedCostUsd)} · {usage.latencyMs} ms
              </p>
            ) : null}
            {entry.candidates.map((candidate) => (
              <article className={styles.panel} key={candidate.id}>
                <pre className={styles.codeBlock}>
                  {JSON.stringify(candidate.payload, null, 2)}
                </pre>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={busy || entry.selectedCandidateId === candidate.id}
                  onClick={() => selectCandidate(entry, candidate)}
                >
                  {entry.selectedCandidateId === candidate.id ? "Seçildi" : "Bu adayı seç"}
                </button>
              </article>
            ))}
          </section>
        );
      })}
    </section>
  );
}
