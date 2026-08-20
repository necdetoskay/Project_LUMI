"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "./test-lab-runner.module.css";

const LAST_HOUSEHOLD_KEY = "lumi.testLab.householdId";
const LAST_CHILD_PROFILE_KEY = "lumi.testLab.childProfileId";
const LAST_SESSION_KEY = "lumi.testLab.sessionId";

const PHASES = [
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

type Rubric = {
  key: string;
  revision: number;
  label: string;
  criteria: Array<{ key: string; label: string; description: string }>;
};

type RunEntry = {
  run: { id: string; phaseId: string; createdAt: string };
  candidates: Array<{ id: string }>;
};

type Inspection = {
  candidates: Array<{
    candidateId: string;
    evaluations: Array<{
      rubricKey: string;
      overallScore: number;
      findings: Array<{
        criterionKey: string;
        score: number;
        finding: string;
        evidence: string | null;
      }>;
    }>;
    judgeConsensus: {
      judgeCount: number;
      meanScore: number;
      variance: number;
    };
  }>;
};

export default function GenesisQualificationPanel() {
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [phaseId, setPhaseId] = useState(PHASES[0][0]);
  const [runs, setRuns] = useState<RunEntry[]>([]);
  const [judgeModelSlug, setJudgeModelSlug] = useState("openai/gpt-4.1-mini");
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([loadRubric(), refreshRuns()]).catch(() => undefined);
  }, []);

  const latestRun = useMemo(() => {
    return runs
      .filter((entry) => entry.run.phaseId === phaseId)
      .sort((left, right) =>
        right.run.createdAt.localeCompare(left.run.createdAt),
      )[0];
  }, [phaseId, runs]);

  const candidateIds =
    latestRun?.candidates.map((candidate) => candidate.id) ?? [];

  async function loadRubric() {
    const response = await fetch("/api/settings/test-lab/evaluations");
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.message ?? "Rubric yüklenemedi.");
    }
    setRubric(payload.data.characterGenesisRubric as Rubric);
  }

  async function refreshRuns() {
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
    setRuns((payload.data.runs ?? []) as RunEntry[]);
  }

  async function runJudge() {
    const context = sandboxContext();
    if (!rubric || candidateIds.length === 0) {
      setMessage("Seçili aşamada değerlendirilecek aday run bulunamadı.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await post("/api/settings/test-lab/evaluations", {
        action: "run-judge",
        householdId: context.householdId,
        childProfileId: context.childProfileId,
        candidateIds,
        rubricKey: rubric.key,
        rubricRevision: rubric.revision,
        mode: candidateIds.length > 1 ? "blind_ranking" : "absolute",
        judgeModelSlug,
      });
      await inspect();
      setMessage(
        "Character Genesis judge qualification kaydedildi; TestSelection değiştirilmedi.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Judge çalıştırılamadı.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function inspect() {
    const context = sandboxContext();
    if (candidateIds.length === 0) return;
    const payload = await post("/api/settings/test-lab/evaluations", {
      action: "inspect",
      householdId: context.householdId,
      childProfileId: context.childProfileId,
      candidateIds,
    });
    setInspection(payload.data as Inspection);
  }

  return (
    <section
      className={styles.shell}
      aria-label="Character Genesis Qualification"
    >
      <section className={styles.panel}>
        <p className={styles.eyebrow}>Character Genesis Qualification</p>
        <h2>Genesis Rubric & Future-Story Yield</h2>
        <p className={styles.muted}>
          Aynı phase/run içindeki adayları blind olarak karşılaştırır. Judge
          sonucu aday seçimini otomatik değiştirmez. Future-story-yield, farklı
          ilişki, eşya, hafıza, yer ve açık thread kaynaklarından tekrar
          kullanılabilir hikâye potansiyelini ölçer.
        </p>
        <div className={styles.settingsGrid}>
          <label className={styles.field}>
            Qualification stage
            <select
              className={styles.input}
              value={phaseId}
              onChange={(event) => {
                setPhaseId(event.target.value as typeof phaseId);
                setInspection(null);
              }}
            >
              {PHASES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            Judge model slug
            <input
              className={styles.input}
              value={judgeModelSlug}
              onChange={(event) => setJudgeModelSlug(event.target.value)}
            />
          </label>
        </div>
        <p className={styles.muted}>
          Rubric:{" "}
          {rubric ? `${rubric.label} · v${rubric.revision}` : "yükleniyor"} ·
          Latest run candidate count: {candidateIds.length}
        </p>
        <div className={styles.metrics}>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={busy || candidateIds.length === 0 || !rubric}
            onClick={runJudge}
          >
            Genesis judge çalıştır
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={busy || candidateIds.length === 0}
            onClick={inspect}
          >
            Qualification sonuçlarını yenile
          </button>
        </div>
        {message ? <p className={styles.status}>{message}</p> : null}
      </section>

      {inspection?.candidates.map((candidate, index) => {
        const evaluations = candidate.evaluations.filter(
          (evaluation) => evaluation.rubricKey === rubric?.key,
        );
        const latest = evaluations.at(-1);
        const yieldFinding = latest?.findings.find(
          (finding) => finding.criterionKey === "future_story_yield",
        );
        return (
          <section className={styles.runCard} key={candidate.candidateId}>
            <h3>Candidate #{index + 1}</h3>
            <p className={styles.muted}>
              Overall {latest?.overallScore.toFixed(2) ?? "—"} · Judge mean{" "}
              {candidate.judgeConsensus.meanScore.toFixed(2)} · Variance{" "}
              {candidate.judgeConsensus.variance.toFixed(3)}
            </p>
            <p>
              <strong>Future-story yield:</strong>{" "}
              {yieldFinding
                ? `${yieldFinding.score}/10 — ${yieldFinding.finding}`
                : "henüz değerlendirilmedi"}
            </p>
            {latest ? (
              <pre className={styles.payload}>
                {JSON.stringify(latest.findings, null, 2)}
              </pre>
            ) : null}
          </section>
        );
      })}
    </section>
  );
}

function sandboxContext() {
  return {
    householdId: window.localStorage.getItem(LAST_HOUSEHOLD_KEY) ?? "",
    childProfileId: window.localStorage.getItem(LAST_CHILD_PROFILE_KEY) ?? "",
    sessionId: window.localStorage.getItem(LAST_SESSION_KEY) ?? "",
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
    throw new Error(
      payload.message ?? payload.error ?? "Test Lab isteği başarısız.",
    );
  }
  return payload;
}
