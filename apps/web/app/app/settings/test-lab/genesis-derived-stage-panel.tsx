"use client";

import { useEffect, useState } from "react";

import styles from "./test-lab-runner.module.css";

const LAST_HOUSEHOLD_KEY = "lumi.testLab.householdId";
const LAST_CHILD_PROFILE_KEY = "lumi.testLab.childProfileId";
const LAST_SESSION_KEY = "lumi.testLab.sessionId";
const LAST_BRANCH_KEY = "lumi.testLab.branchId";
const LAST_STATE_KEY = "lumi.testLab.parentStateId";

type Candidate = {
  id: string;
  payload: Record<string, unknown>;
  candidateStateId: string;
};

type RunEntry = {
  run: { id: string; phaseId: string };
  candidates: Candidate[];
  selectedCandidateId: string | null;
};

export default function GenesisDerivedStagePanel(props: {
  phaseId: string;
  endpoint: string;
  title: string;
  description: string;
  actionLabel: string;
}) {
  const [runs, setRuns] = useState<RunEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
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
    setRuns(history.filter((entry) => entry.run.phaseId === props.phaseId));
  }

  async function runStage() {
    const context = sandboxContext();
    if (!context.sessionId || !context.branchId || !context.parentStateId) {
      setMessage("Önce önceki Character Genesis aşamasını seçin.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await post(props.endpoint, context);
      await refreshHistory();
      setMessage(`${props.title} kanıtı sandbox run olarak kaydedildi.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Aşama çalıştırılamadı.");
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
        phaseId: props.phaseId,
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
      setMessage(`${props.title} sandbox continuation için seçildi.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Aday seçilemedi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.shell} aria-label={`${props.title} Test Lab`}>
      <section className={styles.panel}>
        <p className={styles.eyebrow}>Character Genesis Qualification</p>
        <h2>{props.title}</h2>
        <p className={styles.muted}>{props.description}</p>
        <button
          type="button"
          className={styles.primaryButton}
          disabled={busy}
          onClick={runStage}
        >
          {props.actionLabel}
        </button>
        {message ? <p className={styles.status}>{message}</p> : null}
      </section>

      {runs.map((entry) => (
        <section className={styles.runCard} key={entry.run.id}>
          <h3>Run {entry.run.id.slice(0, 8)}</h3>
          <div className={styles.candidateList}>
            {entry.candidates.map((candidate) => (
              <article className={styles.candidate} key={candidate.id}>
                <pre className={styles.payload}>
                  {JSON.stringify(candidate.payload, null, 2)}
                </pre>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={busy || entry.selectedCandidateId === candidate.id}
                  onClick={() => selectCandidate(entry, candidate)}
                >
                  {entry.selectedCandidateId === candidate.id
                    ? "Seçildi"
                    : "Bu kanıtı seç"}
                </button>
              </article>
            ))}
          </div>
        </section>
      ))}
    </section>
  );
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
