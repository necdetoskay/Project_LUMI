"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "./test-lab-runner.module.css";

const LAST_HOUSEHOLD_KEY = "lumi.testLab.householdId";
const LAST_CHILD_PROFILE_KEY = "lumi.testLab.childProfileId";
const LAST_SESSION_KEY = "lumi.testLab.sessionId";
const LAST_BRANCH_KEY = "lumi.testLab.branchId";
const LAST_STATE_KEY = "lumi.testLab.parentStateId";

const STAGES = [
  ["character_genesis_deep_origin", "Origin Generation"],
  ["character_genesis_origin_structure", "Structured Origin Extraction"],
  ["character_genesis_dna", "Character DNA Derivation"],
  ["character_genesis_social", "Social Genesis"],
  ["character_genesis_inventory", "Inventory Genesis"],
  ["character_genesis_memory_threads", "Memory Seeds / Origin Threads"],
  ["character_genesis_environment", "Initial World / Season State"],
  ["character_genesis_validation", "Genesis Validation"],
  ["character_genesis_first_story_context", "First Story Context Preview"],
] as const;

type RunEntry = {
  run: {
    id: string;
    phaseId: string;
    modelSlug: string | null;
    usageSnapshot: {
      totalTokens: number;
      estimatedCostUsd: number;
      actualCostUsd: number | null;
      latencyMs: number;
    } | null;
    executionSnapshot: {
      productionOperation: string;
      renderedPrompt: { system: string; user: string } | null;
      rawProviderOutput?: string | null;
    } | null;
  };
  candidates: Array<{ id: string; payload: Record<string, unknown> }>;
  selectedCandidateId: string | null;
  selectedStateId: string | null;
};

type Rubric = {
  label: string;
  criteria: Array<{ key: string; label: string }>;
};

type Inspection = {
  candidates: Array<{
    candidateId: string;
    judgeConsensus: {
      judgeCount: number;
      meanScore: number;
      minScore: number;
      maxScore: number;
      variance: number;
    };
    evaluations: unknown[];
  }>;
};

function sandboxContext() {
  return {
    householdId: window.localStorage.getItem(LAST_HOUSEHOLD_KEY) ?? "",
    childProfileId: window.localStorage.getItem(LAST_CHILD_PROFILE_KEY) ?? "",
    sessionId: window.localStorage.getItem(LAST_SESSION_KEY) ?? "",
    branchId: window.localStorage.getItem(LAST_BRANCH_KEY) ?? "",
    parentStateId: window.localStorage.getItem(LAST_STATE_KEY) ?? "",
  };
}

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

function formatCost(value: number | null | undefined) {
  return typeof value === "number" ? `$${value.toFixed(6)}` : "—";
}

export default function GenesisQualificationTestPanel() {
  const [runs, setRuns] = useState<RunEntry[]>([]);
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [judgeModelSlug, setJudgeModelSlug] = useState("openai/gpt-4.1-mini");
  const [evaluationPhaseId, setEvaluationPhaseId] = useState(
    "character_genesis_deep_origin",
  );
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void refresh();
    fetch("/api/settings/test-lab/genesis/evaluations")
      .then((response) => response.json())
      .then((payload) => setRubric(payload.data?.rubric ?? null))
      .catch(() => setMessage("Genesis rubric metadata yüklenemedi."));
  }, []);

  async function refresh() {
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
    setRuns(payload.data.runs ?? []);
  }

  async function runDerivedStage(path: string, successMessage: string) {
    const context = sandboxContext();
    if (!context.sessionId || !context.branchId || !context.parentStateId) {
      setMessage("Önce önceki Genesis aşamalarını seçerek sandbox state oluşturun.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const payload = await post(path, context);
      const candidate = payload.data.candidates?.[0]?.candidate;
      if (!candidate) throw new Error("Derived stage candidate üretmedi.");
      const selected = await post("/api/settings/test-lab", {
        action: "select-candidate",
        sessionId: context.sessionId,
        branchId: context.branchId,
        phaseId: payload.data.phaseId,
        runId: payload.data.run.id,
        candidateId: candidate.id,
      });
      window.localStorage.setItem(
        LAST_BRANCH_KEY,
        selected.data.activeBranchId as string,
      );
      window.localStorage.setItem(
        LAST_STATE_KEY,
        selected.data.selection.selectedStateId as string,
      );
      await refresh();
      setMessage(successMessage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Aşama çalıştırılamadı.");
    } finally {
      setBusy(false);
    }
  }

  const evaluationCandidates = useMemo(
    () =>
      runs
        .filter((entry) => entry.run.phaseId === evaluationPhaseId)
        .flatMap((entry) => entry.candidates.map((candidate) => candidate.id)),
    [evaluationPhaseId, runs],
  );

  async function runJudge() {
    const context = sandboxContext();
    if (evaluationCandidates.length === 0) {
      setMessage("Seçili aşamada değerlendirilecek aday yok.");
      return;
    }
    setBusy(true);
    try {
      await post("/api/settings/test-lab/genesis/evaluations", {
        action: "run-judge",
        householdId: context.householdId,
        childProfileId: context.childProfileId,
        candidateIds: evaluationCandidates,
        judgeModelSlug,
      });
      await inspectJudge();
      setMessage("Genesis blind judge değerlendirmesi kaydedildi; seçim değiştirilmedi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Judge çalıştırılamadı.");
    } finally {
      setBusy(false);
    }
  }

  async function inspectJudge() {
    const context = sandboxContext();
    if (evaluationCandidates.length === 0) return;
    const payload = await post("/api/settings/test-lab/genesis/evaluations", {
      action: "inspect",
      householdId: context.householdId,
      childProfileId: context.childProfileId,
      candidateIds: evaluationCandidates,
    });
    setInspection(payload.data as Inspection);
  }

  return (
    <section className={styles.shell} aria-label="Character Genesis Qualification">
      <section className={styles.panel}>
        <p className={styles.eyebrow}>Character Genesis · #388</p>
        <h2>Qualification Journey</h2>
        <p className={styles.muted}>
          Production-backed Genesis aşamalarını tek görünümde inspect eder,
          derived qualification aşamalarını çalıştırır ve future-story-yield
          dahil Genesis rubric ile adayları blind karşılaştırır.
        </p>
        <div className={styles.metrics}>
          <button className={styles.secondaryButton} disabled={busy} onClick={() => runDerivedStage("/api/settings/test-lab/genesis/origin-structure", "Structured Origin Extraction seçildi.")}>Structured Origin Extraction</button>
          <button className={styles.secondaryButton} disabled={busy} onClick={() => runDerivedStage("/api/settings/test-lab/genesis/validation", "Genesis Validation seçildi.")}>Genesis Validation</button>
          <button className={styles.primaryButton} disabled={busy} onClick={() => runDerivedStage("/api/settings/test-lab/genesis/first-story-context", "First Story Context Preview production composer üzerinden üretildi.")}>First Story Context Preview</button>
          <button className={styles.secondaryButton} disabled={busy} onClick={refresh}>Journey&apos;yi yenile</button>
        </div>
      </section>

      <section className={styles.panel}>
        <h3>Stage evidence</h3>
        <div className={styles.candidateList}>
          {STAGES.map(([phaseId, label]) => {
            const entries = runs.filter((entry) => entry.run.phaseId === phaseId);
            const latest = entries.at(-1);
            const usage = latest?.run.usageSnapshot;
            return (
              <article className={styles.candidate} key={phaseId}>
                <strong>{label}</strong>
                <p className={styles.muted}>{latest ? `${entries.length} run · ${latest.candidates.length} candidate · ${latest.selectedCandidateId ? "selected" : "not selected"}` : "Henüz çalıştırılmadı"}</p>
                {latest ? (
                  <>
                    <p className={styles.muted}>Operation: {latest.run.executionSnapshot?.productionOperation ?? "derived"}{latest.run.modelSlug ? ` · ${latest.run.modelSlug}` : " · deterministic"}{usage ? ` · ${usage.totalTokens} token · ${formatCost(usage.actualCostUsd ?? usage.estimatedCostUsd)} · ${usage.latencyMs} ms` : ""}</p>
                    <details><summary>Prompt / raw output / parsed candidate / selection evidence</summary><pre className={styles.payload}>{JSON.stringify({ renderedPrompt: latest.run.executionSnapshot?.renderedPrompt ?? null, rawProviderOutput: latest.run.executionSnapshot?.rawProviderOutput ?? null, candidates: latest.candidates, selectedCandidateId: latest.selectedCandidateId, selectedStateId: latest.selectedStateId }, null, 2)}</pre></details>
                  </>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.panel}>
        <h3>Genesis rubric / blind judge</h3>
        {rubric ? <p className={styles.muted}>{rubric.label} · {rubric.criteria.map((item) => item.label).join(" · ")}</p> : null}
        <div className={styles.settingsGrid}>
          <label className={styles.field}>Aşama<select className={styles.input} value={evaluationPhaseId} onChange={(event) => { setEvaluationPhaseId(event.target.value); setInspection(null); }}>{STAGES.filter(([phaseId]) => !["character_genesis_origin_structure", "character_genesis_validation", "character_genesis_first_story_context"].includes(phaseId)).map(([phaseId, label]) => <option key={phaseId} value={phaseId}>{label}</option>)}</select></label>
          <label className={styles.field}>Judge model slug<input className={styles.input} value={judgeModelSlug} onChange={(event) => setJudgeModelSlug(event.target.value)} /></label>
        </div>
        <div className={styles.metrics}><button className={styles.primaryButton} disabled={busy} onClick={runJudge}>Blind judge çalıştır</button><button className={styles.secondaryButton} disabled={busy} onClick={inspectJudge}>Judge kayıtlarını yenile</button></div>
        {inspection ? <pre className={styles.payload}>{JSON.stringify(inspection, null, 2)}</pre> : null}
        {message ? <p className={styles.status}>{message}</p> : null}
      </section>
    </section>
  );
}
