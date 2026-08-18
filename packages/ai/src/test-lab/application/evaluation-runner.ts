import { randomUUID } from "node:crypto";

import {
  calculateOverallScore,
  createBlindCandidateSet,
  type CandidateEvaluation,
  type EvaluationExecution,
  type EvaluationMode,
} from "../domain/evaluation";
import type { JsonObject, JsonValue } from "../domain/test-lab-types";
import type { EvaluationJudgeAdapter } from "../ports/evaluation-judge-adapter";
import type { EvaluationRepository } from "../ports/evaluation-repository";
import { EvaluationRegistry } from "./evaluation-registry";

export interface EvaluationCandidateInput {
  sessionId: string;
  runId: string;
  candidateId: string;
  payload: JsonObject;
}

export interface RunJudgeEvaluationInput {
  rubricKey: string;
  rubricRevision: number;
  mode: EvaluationMode;
  judgeModelSlug: string;
  candidates: EvaluationCandidateInput[];
}

export interface RunJudgeEvaluationResult {
  execution: EvaluationExecution;
  evaluations: CandidateEvaluation[];
}

export class EvaluationRunner {
  constructor(
    private readonly repository: EvaluationRepository,
    private readonly judgeAdapter: EvaluationJudgeAdapter,
    private readonly registry = new EvaluationRegistry(repository),
  ) {}

  async runJudgeEvaluation(
    input: RunJudgeEvaluationInput,
  ): Promise<RunJudgeEvaluationResult> {
    if (input.candidates.length === 0) {
      throw new Error("TEST_LAB_EVALUATION_NO_CANDIDATES");
    }
    const sessionId = input.candidates[0]!.sessionId;
    if (input.candidates.some((candidate) => candidate.sessionId !== sessionId)) {
      throw new Error("TEST_LAB_EVALUATION_CROSS_SESSION_CANDIDATES");
    }

    const rubric = await this.registry.resolve(
      input.rubricKey,
      input.rubricRevision,
    );
    const blindCandidates = createBlindCandidateSet(
      input.candidates.map((candidate) => ({
        candidateId: candidate.candidateId,
        payload: sanitizeBlindPayload(candidate.payload),
      })),
    );
    const judgeResult = await this.judgeAdapter.evaluate({
      rubric,
      mode: input.mode,
      judgeModelSlug: input.judgeModelSlug,
      candidates: blindCandidates,
    });
    if (judgeResult.judgeModelSlug !== input.judgeModelSlug) {
      throw new Error("TEST_LAB_EVALUATION_JUDGE_MODEL_MISMATCH");
    }

    const candidateByLabel = new Map(
      blindCandidates.map((candidate) => [candidate.label, candidate]),
    );
    const inputById = new Map(
      input.candidates.map((candidate) => [candidate.candidateId, candidate]),
    );
    const seenLabels = new Set<string>();
    const createdAt = new Date().toISOString();
    const execution: EvaluationExecution = {
      id: randomUUID(),
      sessionId,
      rubricKey: rubric.key,
      rubricRevision: rubric.revision,
      mode: input.mode,
      authorType: "judge",
      authorId: judgeResult.judgeId,
      judgeModelSlug: judgeResult.judgeModelSlug,
      usageSnapshot: judgeResult.usageSnapshot,
      provenance: judgeResult.provenance,
      createdAt,
    };
    await this.repository.saveExecution(execution);

    const evaluations: CandidateEvaluation[] = [];
    for (const result of judgeResult.candidates) {
      if (seenLabels.has(result.candidateLabel)) {
        throw new Error(
          `TEST_LAB_EVALUATION_DUPLICATE_LABEL:${result.candidateLabel}`,
        );
      }
      seenLabels.add(result.candidateLabel);
      const blindCandidate = candidateByLabel.get(result.candidateLabel);
      if (!blindCandidate) {
        throw new Error(
          `TEST_LAB_EVALUATION_UNKNOWN_LABEL:${result.candidateLabel}`,
        );
      }
      const source = inputById.get(blindCandidate.candidateId)!;
      const evaluation: CandidateEvaluation = {
        id: randomUUID(),
        evaluationExecutionId: execution.id,
        sessionId,
        runId: source.runId,
        candidateId: source.candidateId,
        rubricKey: rubric.key,
        rubricRevision: rubric.revision,
        mode: input.mode,
        authorType: "judge",
        authorId: judgeResult.judgeId,
        judgeModelSlug: judgeResult.judgeModelSlug,
        findings: structuredClone(result.findings),
        overallScore: calculateOverallScore(rubric, result.findings),
        rank: result.rank,
        createdAt,
      };
      await this.repository.saveEvaluation(evaluation);
      evaluations.push(evaluation);
    }

    if (evaluations.length !== input.candidates.length) {
      throw new Error("TEST_LAB_EVALUATION_INCOMPLETE_JUDGE_RESULT");
    }
    return { execution, evaluations };
  }
}

const BLIND_METADATA_KEYS = new Set([
  "modelslug",
  "generatormodelslug",
  "judgemodelslug",
  "provider",
  "providerid",
  "pricingsnapshot",
  "usagesnapshot",
  "executionsnapshot",
]);

function sanitizeBlindPayload(payload: JsonObject): JsonObject {
  return sanitizeJsonValue(payload) as JsonObject;
}

function sanitizeJsonValue(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(sanitizeJsonValue);
  if (value === null || typeof value !== "object") return value;
  const output: JsonObject = {};
  for (const [key, item] of Object.entries(value)) {
    if (BLIND_METADATA_KEYS.has(key.toLowerCase())) continue;
    output[key] = sanitizeJsonValue(item);
  }
  return output;
}
