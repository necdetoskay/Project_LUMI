"use client";

import { useEffect, useMemo, useState } from "react";

type RubricCriterion = {
  key: string;
  label: string;
  description: string;
  minScore: number;
  maxScore: number;
};

type Rubric = {
  key: string;
  revision: number;
  label: string;
  criteria: RubricCriterion[];
};

type EvaluationInspection = {
  candidates: Array<{
    candidateId: string;
    evaluations: Array<{
      id: string;
      evaluationExecutionId: string;
      authorType: "judge" | "human";
      authorId: string;
      judgeModelSlug: string | null;
      overallScore: number;
      rank: number | null;
      findings: Array<{
        criterionKey: string;
        score: number;
        finding: string;
        evidence: string | null;
      }>;
    }>;
    executions: Array<{
      id: string;
      authorType: "judge" | "human";
      authorId: string;
      judgeModelSlug: string | null;
      mode: "absolute" | "blind_ranking";
      usageSnapshot: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        estimatedCostUsd: number;
        actualCostUsd: number | null;
        latencyMs: number;
      } | null;
      provenance: Record<string, unknown> | null;
    }>;
    judgeConsensus: {
      judgeCount: number;
      meanScore: number;
      minScore: number;
      maxScore: number;
      variance: number;
      scores: Array<{ judgeId: string; score: number }>;
    };
    stateConsistency: {
      consistent: boolean;
      issues: Array<{
        code: string;
        severity: string;
        message: string;
        evidence: string;
      }>;
    };
  }>;
  agreement: {
    candidateCount: number;
    meanAbsoluteScoreDifference: number | null;
    rankingAgreement: number | null;
    perCandidate: Array<{
      candidateId: string;
      judgeMeanScore: number;
      humanMeanScore: number;
      absoluteDifference: number;
    }>;
  };
};

export function EvaluationPanel(props: {
  householdId: string;
  childProfileId: string;
  sessionId: string;
  branchId: string;
  candidateIds: string[];
  storyScenario: boolean;
}) {
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [judgeModelSlug, setJudgeModelSlug] = useState("openai/gpt-4.1-mini");
  const [mode, setMode] = useState<"absolute" | "blind_ranking">(
    "blind_ranking",
  );
  const [humanCandidateId, setHumanCandidateId] = useState("");
  const [humanScores, setHumanScores] = useState<Record<string, number>>({});
  const [humanNote, setHumanNote] = useState("");
  const [inspection, setInspection] = useState<EvaluationInspection | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings/test-lab/evaluations")
      .then((response) => response.json())
      .then((payload) => {
        const nextRubric = payload.data?.defaultRubric as Rubric | undefined;
        if (!nextRubric) return;
        setRubric(nextRubric);
        setHumanScores(
          Object.fromEntries(
            nextRubric.criteria.map((criterion) => [criterion.key, 7]),
          ),
        );
      })
      .catch(() => setMessage("Evaluation metadata yüklenemedi."));
  }, []);

  useEffect(() => {
    if (!props.candidateIds.includes(humanCandidateId)) {
      setHumanCandidateId(props.candidateIds[0] ?? "");
    }
  }, [humanCandidateId, props.candidateIds]);

  const candidateKey = useMemo(
    () => props.candidateIds.join(","),
    [props.candidateIds],
  );

  useEffect(() => {
    if (!candidateKey) {
      setInspection(null);
      return;
    }
    void inspect();
    // candidateKey intentionally represents the candidate-set identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateKey]);

  async function inspect() {
    if (props.candidateIds.length === 0) return;
    try {
      const payload = await evaluationPost({
        action: "inspect",
        householdId: props.householdId,
        childProfileId: props.childProfileId,
        candidateIds: props.candidateIds,
      });
      setInspection(payload.data as EvaluationInspection);
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }

  async function runJudge() {
    if (!rubric || props.candidateIds.length === 0) return;
    setBusy(true);
    setMessage("");
    try {
      await evaluationPost({
        action: "run-judge",
        householdId: props.householdId,
        childProfileId: props.childProfileId,
        candidateIds: props.candidateIds,
        rubricKey: rubric.key,
        rubricRevision: rubric.revision,
        mode,
        judgeModelSlug,
      });
      await inspect();
      setMessage(
        "Blind judge evaluation kaydedildi. TestSelection değiştirilmedi.",
      );
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function runArcJudge() {
    if (!props.storyScenario) return;
    setBusy(true);
    setMessage("");
    try {
      await evaluationPost({
        action: "run-arc-judge",
        householdId: props.householdId,
        childProfileId: props.childProfileId,
        sessionId: props.sessionId,
        branchId: props.branchId,
        judgeModelSlug,
      });
      await inspect();
      setMessage(
        "Selected story lineage için long-horizon arc evaluation kaydedildi.",
      );
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function saveHuman() {
    if (!rubric || !humanCandidateId) return;
    setBusy(true);
    setMessage("");
    try {
      await evaluationPost({
        action: "save-human",
        householdId: props.householdId,
        childProfileId: props.childProfileId,
        candidateId: humanCandidateId,
        rubricKey: rubric.key,
        rubricRevision: rubric.revision,
        mode: "absolute",
        note: humanNote,
        findings: rubric.criteria.map((criterion) => ({
          criterionKey: criterion.key,
          score: humanScores[criterion.key] ?? 7,
          finding: "Human quality score",
          evidence: humanNote || null,
        })),
      });
      await inspect();
      setMessage(
        "Human evaluation ayrı kaydedildi. Candidate selection değiştirilmedi.",
      );
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (props.candidateIds.length === 0) return null;

  return (
    <section style={panelStyle}>
      <h2>8. Evaluation Engine</h2>
      <p style={{ opacity: 0.75 }}>
        Judge değerlendirmeleri blind Candidate A/B/C payload&apos;larıyla
        çalışır. AI recommendation veya human score TestSelection&apos;ı
        otomatik değiştirmez.
      </p>

      <div style={gridStyle}>
        <label>
          Judge model slug
          <input
            value={judgeModelSlug}
            onChange={(event) => setJudgeModelSlug(event.target.value)}
            style={inputStyle}
          />
        </label>
        <label>
          Evaluation mode
          <select
            value={mode}
            onChange={(event) =>
              setMode(event.target.value as "absolute" | "blind_ranking")
            }
            style={inputStyle}
          >
            <option value="blind_ranking">Blind ranking</option>
            <option value="absolute">Absolute</option>
          </select>
        </label>
        <label>
          Rubric
          <input
            readOnly
            value={rubric ? `${rubric.label} · v${rubric.revision}` : "loading"}
            style={inputStyle}
          />
        </label>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button disabled={busy} onClick={runJudge} style={buttonStyle}>
          Blind judge çalıştır
        </button>
        <button disabled={busy} onClick={inspect} style={buttonStyle}>
          Evaluation kayıtlarını yenile
        </button>
        {props.storyScenario ? (
          <button disabled={busy} onClick={runArcJudge} style={buttonStyle}>
            Selected story arc değerlendir
          </button>
        ) : null}
      </div>

      {rubric ? (
        <div style={{ ...panelStyle, marginTop: 16 }}>
          <h3>Human scoring</h3>
          <label>
            Candidate
            <select
              value={humanCandidateId}
              onChange={(event) => setHumanCandidateId(event.target.value)}
              style={inputStyle}
            >
              {props.candidateIds.map((candidateId, index) => (
                <option key={candidateId} value={candidateId}>
                  Candidate #{index + 1} · {candidateId}
                </option>
              ))}
            </select>
          </label>
          <div style={{ ...gridStyle, marginTop: 12 }}>
            {rubric.criteria.map((criterion) => (
              <label key={criterion.key} title={criterion.description}>
                {criterion.label}
                <input
                  type="number"
                  min={criterion.minScore}
                  max={criterion.maxScore}
                  value={humanScores[criterion.key] ?? 7}
                  onChange={(event) =>
                    setHumanScores((previous) => ({
                      ...previous,
                      [criterion.key]: Number(event.target.value),
                    }))
                  }
                  style={inputStyle}
                />
              </label>
            ))}
          </div>
          <label style={{ display: "block", marginTop: 12 }}>
            Human note
            <textarea
              rows={3}
              value={humanNote}
              onChange={(event) => setHumanNote(event.target.value)}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </label>
          <button disabled={busy} onClick={saveHuman} style={buttonStyle}>
            Human evaluation kaydet
          </button>
        </div>
      ) : null}

      {message ? <p>{message}</p> : null}

      {inspection ? (
        <>
          <div style={{ ...panelStyle, marginTop: 16 }}>
            <h3>Judge ↔ Human Agreement</h3>
            <pre style={metaStyle}>
              {JSON.stringify(inspection.agreement, null, 2)}
            </pre>
          </div>
          <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
            {inspection.candidates.map((candidate, index) => (
              <article key={candidate.candidateId} style={panelStyle}>
                <h3>
                  Candidate #{index + 1} · {candidate.candidateId}
                </h3>
                <p>
                  Judge count: {candidate.judgeConsensus.judgeCount} · Mean:{" "}
                  {candidate.judgeConsensus.meanScore.toFixed(2)} · Variance:{" "}
                  {candidate.judgeConsensus.variance.toFixed(3)}
                </p>
                <details open={!candidate.stateConsistency.consistent}>
                  <summary>
                    Narrative ↔ resulting-state consistency ·{" "}
                    {candidate.stateConsistency.consistent
                      ? "consistent"
                      : "inconsistency found"}
                  </summary>
                  <pre style={metaStyle}>
                    {JSON.stringify(candidate.stateConsistency, null, 2)}
                  </pre>
                </details>
                <details>
                  <summary>Criterion findings / ranks</summary>
                  <pre style={metaStyle}>
                    {JSON.stringify(candidate.evaluations, null, 2)}
                  </pre>
                </details>
                <details>
                  <summary>Judge execution usage / cost / provenance</summary>
                  <pre style={metaStyle}>
                    {JSON.stringify(candidate.executions, null, 2)}
                  </pre>
                </details>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

async function evaluationPost(body: Record<string, unknown>) {
  const response = await fetch("/api/settings/test-lab/evaluations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message ?? "Evaluation request failed");
  }
  return payload;
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Beklenmeyen evaluation hatası";
}

const panelStyle = {
  border: "1px solid rgba(127,127,127,.28)",
  borderRadius: 16,
  padding: 20,
  marginTop: 20,
} as const;

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
} as const;

const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 11px",
  marginTop: 6,
  borderRadius: 8,
  border: "1px solid rgba(127,127,127,.4)",
  background: "transparent",
  color: "inherit",
} as const;

const buttonStyle = {
  marginTop: 14,
  padding: "9px 13px",
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
