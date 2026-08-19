"use client";

import { useEffect, useState } from "react";

import styles from "./test-lab-runner.module.css";

const PHASE_ID = "character_genesis_social";
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
    throw new Error(
      payload.message ?? payload.error ?? "Test Lab isteği başarısız.",
    );
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

export default function SocialGenesisTestPanel() {
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
      setMessage(
        "Önce Character DNA dahil önceki sandbox aşamalarını tamamlayın.",
      );
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const payload = await post("/api/settings/test-lab/genesis/social", {
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
      setMessage("Social Genesis production promptu hazırlandı.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Prompt hazırlanamadı.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function runSocialGenesis() {
    const context = sandboxContext();
    if (
      !prompt ||
      !context.sessionId ||
      !context.branchId ||
      !context.parentStateId
    ) {
      setMessage("Önce production promptunu yükleyin.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const payload = await post("/api/settings/test-lab/genesis/social", {
        action: "run",
        ...context,
        modelSlug,
        locale,
        promptOverride: { system: prompt.system, user: prompt.user },
      });
      await refreshHistory();
      setMessage(
        `${payload.data.candidates.length} Social Genesis adayı üretildi; NPC dedup ve directional graph kaydedildi.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Social Genesis çalıştırılamadı.",
      );
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
      window.localStorage.setItem(
        LAST_BRANCH_KEY,
        payload.data.activeBranchId as string,
      );
      window.localStorage.setItem(
        LAST_STATE_KEY,
        payload.data.selection.selectedStateId as string,
      );
      await refreshHistory();
      setMessage("Social Genesis adayı sandbox state için seçildi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Aday seçilemedi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.shell} aria-label="Social Genesis Test Lab">
      <section className={styles.panel}>
        <p className={styles.eyebrow}>Character Genesis</p>
        <h2>Social Genesis</h2>
        <p className={styles.muted}>
          Origin ve Character DNA bağlamından 0-6 anlamlı NPC üretir;
          origin/derived kimlikleri deduplicate eder ve A→B ile B→A için ayrı
          relationship vector türetir. Model numeric relationship değeri
          üretmez.
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
        <button
          type="button"
          className={styles.secondaryButton}
          disabled={busy}
          onClick={previewPrompt}
        >
          Production Social Genesis promptunu yükle
        </button>

        {prompt ? (
          <section className={styles.promptCard}>
            <p className={styles.muted}>
              {prompt.promptKey} · v{prompt.promptVersion}
            </p>
            <label className={styles.field}>
              System prompt
              <textarea
                rows={6}
                className={styles.promptTextarea}
                value={prompt.system}
                onChange={(event) =>
                  setPrompt({ ...prompt, system: event.target.value })
                }
              />
            </label>
            <label className={styles.field}>
              User prompt
              <textarea
                rows={16}
                className={styles.promptTextarea}
                value={prompt.user}
                onChange={(event) =>
                  setPrompt({ ...prompt, user: event.target.value })
                }
              />
            </label>
            <button
              type="button"
              className={styles.primaryButton}
              disabled={busy}
              onClick={runSocialGenesis}
            >
              {busy ? "Çalışıyor..." : "Social Genesis üret"}
            </button>
          </section>
        ) : null}

        {message ? <p className={styles.muted}>{message}</p> : null}

        <section className={styles.historySection}>
          <div className={styles.historyHeader}>
            <h3>Social Genesis run sonuçları</h3>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={busy}
              onClick={() => refreshHistory()}
            >
              Yenile
            </button>
          </div>
          {runs.length === 0 ? (
            <div className={styles.emptyState}>
              Henüz Social Genesis runı yok.
            </div>
          ) : (
            <div className={styles.runList}>
              {[...runs].reverse().map((entry, index) => {
                const usage = entry.run.usageSnapshot;
                const execution = entry.run.executionSnapshot;
                return (
                  <article key={entry.run.id} className={styles.runCard}>
                    <div className={styles.runHeader}>
                      <strong>Social Genesis Run {runs.length - index}</strong>
                      <span className={styles.runMeta}>
                        {entry.run.modelSlug ?? "model bilinmiyor"}
                      </span>
                    </div>
                    {usage ? (
                      <div className={styles.metrics}>
                        <span>Input {usage.promptTokens} token</span>
                        <span>Output {usage.completionTokens} token</span>
                        <span>Toplam {usage.totalTokens} token</span>
                        <span>{usage.latencyMs} ms</span>
                        <span>
                          {formatCost(
                            usage.actualCostUsd ?? usage.estimatedCostUsd,
                          )}
                        </span>
                      </div>
                    ) : null}
                    <details className={styles.runPrompt}>
                      <summary>Kullanılan prompt</summary>
                      <div className={styles.promptSnapshot}>
                        <strong>System</strong>
                        <pre>{execution?.renderedPrompt?.system ?? "—"}</pre>
                        <strong>User</strong>
                        <pre>{execution?.renderedPrompt?.user ?? "—"}</pre>
                      </div>
                    </details>
                    <details className={styles.runPrompt}>
                      <summary>Raw provider output</summary>
                      <pre className={styles.payload}>
                        {execution?.rawProviderOutput ?? "Raw output yok"}
                      </pre>
                    </details>
                    <div className={styles.candidateList}>
                      {entry.candidates.map((candidate, candidateIndex) => (
                        <article
                          key={candidate.id}
                          className={styles.candidate}
                        >
                          <strong>Social aday {candidateIndex + 1}</strong>
                          <pre className={styles.payload}>
                            {JSON.stringify(candidate.payload, null, 2)}
                          </pre>
                          <button
                            type="button"
                            className={styles.primaryButton}
                            disabled={
                              busy || entry.selectedCandidateId === candidate.id
                            }
                            onClick={() => selectCandidate(entry, candidate)}
                          >
                            {entry.selectedCandidateId === candidate.id
                              ? "Seçildi"
                              : "Sandbox state için seç"}
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
      </section>
    </section>
  );
}
