import { NextResponse } from "next/server";

import { getAiDb } from "@lumi/ai/db/client";
import {
  calculateJudgeHumanAgreement,
  checkNarrativeStateConsistency,
  createStoryArcEvaluationPayload,
  DrizzleEvaluationRepository,
  DrizzleTestLabRepository,
  EvaluationRunner,
  STORY_ARC_RUBRIC_V1,
  STORY_QUALITY_RUBRIC_V1,
  summarizeJudgeConsensus,
  type EvaluationFinding,
  type EvaluationMode,
  type JsonObject,
} from "@lumi/ai/test-lab";
import { withParent } from "@/lib/auth/with-parent";
import { testLabEvaluationJudgeAdapter } from "@/lib/ai/test-lab-evaluation-judge-adapter";
import { assertSandboxOwner } from "@/lib/ai/test-lab-sandbox-owner";
import { readRequestBody } from "@/lib/http/request-body";
import { observeHandler } from "@/lib/observability/observed-api-route";

function services() {
  const db = getAiDb();
  const testLabRepository = new DrizzleTestLabRepository(db);
  const evaluationRepository = new DrizzleEvaluationRepository(db);
  const runner = new EvaluationRunner(
    evaluationRepository,
    testLabEvaluationJudgeAdapter,
  );
  return { testLabRepository, evaluationRepository, runner };
}

export const GET = observeHandler(() => {
  return withParent(async () =>
    NextResponse.json({
      data: {
        defaultRubric: STORY_QUALITY_RUBRIC_V1,
        storyArcRubric: STORY_ARC_RUBRIC_V1,
        modes: ["absolute", "blind_ranking"],
      },
    }),
  );
}, "/api/settings/test-lab/evaluations");

export const POST = observeHandler(async (request: Request) => {
  return withParent(async (parent) => {
    const body = (await readRequestBody(request)) as Record<string, unknown>;
    const action = requiredString(body.action, "action");
    const householdId = requiredString(body.householdId, "householdId");
    const childProfileId = requiredString(
      body.childProfileId,
      "childProfileId",
    );
    const { testLabRepository, evaluationRepository, runner } = services();

    try {
      await ensureRubrics(evaluationRepository);

      if (action === "run-judge") {
        const candidateIds = stringArray(body.candidateIds, "candidateIds");
        const candidates = await loadOwnedCandidates({
          candidateIds,
          parentId: parent.id,
          householdId,
          childProfileId,
          testLabRepository,
        });
        const result = await runner.runJudgeEvaluation({
          rubricKey: optionalString(body.rubricKey) ?? "story_quality",
          rubricRevision: positiveInteger(body.rubricRevision ?? 1),
          mode: evaluationMode(body.mode),
          judgeModelSlug: requiredString(body.judgeModelSlug, "judgeModelSlug"),
          candidates,
        });
        return NextResponse.json({ data: result });
      }

      if (action === "run-arc-judge") {
        const sessionId = requiredString(body.sessionId, "sessionId");
        const branchId = requiredString(body.branchId, "branchId");
        const selections = (await testLabRepository.listSelections(branchId)).sort(
          (left, right) => left.createdAt.localeCompare(right.createdAt),
        );
        if (selections.length === 0) {
          throw new Error("TEST_LAB_EVALUATION_ARC_REQUIRES_SELECTIONS");
        }
        const entries = [];
        let anchor: Awaited<ReturnType<typeof loadOwnedCandidateDetails>> = null;
        for (const selection of selections) {
          const details = await loadOwnedCandidateDetails({
            candidateId: selection.candidateId,
            parentId: parent.id,
            householdId,
            childProfileId,
            testLabRepository,
          });
          if (details.candidate.sessionId !== sessionId) {
            throw new Error("TEST_LAB_EVALUATION_ARC_SESSION_MISMATCH");
          }
          anchor = details;
          entries.push({
            storyId: selection.phaseId,
            narrative: extractNarrative(details.candidate.payload),
            resultingState: details.candidateState.value,
          });
        }
        if (!anchor) throw new Error("TEST_LAB_EVALUATION_ARC_ANCHOR_MISSING");
        const result = await runner.runJudgeEvaluation({
          rubricKey: "story_arc_quality",
          rubricRevision: 1,
          mode: "absolute",
          judgeModelSlug: requiredString(body.judgeModelSlug, "judgeModelSlug"),
          candidates: [
            {
              sessionId,
              runId: anchor.candidate.runId,
              candidateId: anchor.candidate.id,
              payload: createStoryArcEvaluationPayload(entries),
            },
          ],
        });
        return NextResponse.json({ data: result });
      }

      if (action === "save-human") {
        const [candidate] = await loadOwnedCandidates({
          candidateIds: [requiredString(body.candidateId, "candidateId")],
          parentId: parent.id,
          householdId,
          childProfileId,
          testLabRepository,
        });
        if (!candidate)
          throw new Error("TEST_LAB_EVALUATION_CANDIDATE_NOT_FOUND");
        const result = await runner.recordHumanEvaluation({
          rubricKey: optionalString(body.rubricKey) ?? "story_quality",
          rubricRevision: positiveInteger(body.rubricRevision ?? 1),
          mode: evaluationMode(body.mode),
          authorId: parent.id,
          candidate,
          findings: evaluationFindings(body.findings),
          rank: optionalPositiveInteger(body.rank),
          note: optionalString(body.note),
        });
        return NextResponse.json({ data: result });
      }

      if (action === "inspect") {
        const candidateIds = stringArray(body.candidateIds, "candidateIds");
        const details = await Promise.all(
          candidateIds.map((candidateId) =>
            loadOwnedCandidateDetails({
              candidateId,
              parentId: parent.id,
              householdId,
              childProfileId,
              testLabRepository,
            }),
          ),
        );
        const candidates = await Promise.all(
          details.map(async (detail) => {
            const evaluations =
              await evaluationRepository.listCandidateEvaluations(
                detail.candidate.id,
              );
            const executions = await Promise.all(
              [
                ...new Set(
                  evaluations.map((item) => item.evaluationExecutionId),
                ),
              ].map((id) => evaluationRepository.getExecution(id)),
            );
            return {
              candidateId: detail.candidate.id,
              evaluations,
              executions: executions.filter(Boolean),
              judgeConsensus: summarizeJudgeConsensus(
                detail.candidate.id,
                evaluations,
              ),
              stateConsistency: checkNarrativeStateConsistency({
                narrative: extractNarrative(detail.candidate.payload),
                beforeState: detail.parentState.value,
                afterState: detail.candidateState.value,
              }),
            };
          }),
        );
        const agreement = calculateJudgeHumanAgreement({
          judgeConsensus: candidates.map((item) => item.judgeConsensus),
          humanEvaluations: candidates.flatMap((item) =>
            item.evaluations.filter(
              (evaluation) => evaluation.authorType === "human",
            ),
          ),
        });
        return NextResponse.json({ data: { candidates, agreement } });
      }

      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: `Unknown action: ${action}` },
        { status: 400 },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const status = message.includes("FORBIDDEN") ? 403 : 400;
      return NextResponse.json(
        { error: "TEST_LAB_EVALUATION_ERROR", message },
        { status },
      );
    }
  });
}, "/api/settings/test-lab/evaluations");

async function ensureRubrics(
  repository: DrizzleEvaluationRepository,
): Promise<void> {
  for (const rubric of [STORY_QUALITY_RUBRIC_V1, STORY_ARC_RUBRIC_V1]) {
    if (await repository.getRubric(rubric.key, rubric.revision)) continue;
    try {
      await repository.saveRubric(rubric);
    } catch {
      if (!(await repository.getRubric(rubric.key, rubric.revision))) {
        throw new Error(
          `TEST_LAB_EVALUATION_RUBRIC_SEED_FAILED:${rubric.key}@${rubric.revision}`,
        );
      }
    }
  }
}

async function loadOwnedCandidates(input: {
  candidateIds: string[];
  parentId: string;
  householdId: string;
  childProfileId: string;
  testLabRepository: DrizzleTestLabRepository;
}) {
  return Promise.all(
    input.candidateIds.map(async (candidateId) => {
      const details = await loadOwnedCandidateDetails({
        candidateId,
        parentId: input.parentId,
        householdId: input.householdId,
        childProfileId: input.childProfileId,
        testLabRepository: input.testLabRepository,
      });
      return {
        sessionId: details.candidate.sessionId,
        runId: details.candidate.runId,
        candidateId: details.candidate.id,
        payload: details.candidate.payload,
      };
    }),
  );
}

async function loadOwnedCandidateDetails(input: {
  candidateId: string;
  parentId: string;
  householdId: string;
  childProfileId: string;
  testLabRepository: DrizzleTestLabRepository;
}) {
  const candidate = await input.testLabRepository.getCandidate(input.candidateId);
  if (!candidate) {
    throw new Error(`TEST_LAB_CANDIDATE_NOT_FOUND:${input.candidateId}`);
  }
  const run = await input.testLabRepository.getRun(candidate.runId);
  if (!run) throw new Error(`TEST_LAB_RUN_NOT_FOUND:${candidate.runId}`);
  const parentState = await input.testLabRepository.getState(run.parentStateId);
  const candidateState = await input.testLabRepository.getState(
    candidate.candidateStateId,
  );
  if (!parentState || !candidateState) {
    throw new Error(`TEST_LAB_EVALUATION_STATE_NOT_FOUND:${candidate.id}`);
  }
  assertSandboxOwner(parentState, {
    parentId: input.parentId,
    householdId: input.householdId,
    childProfileId: input.childProfileId,
  });
  assertSandboxOwner(candidateState, {
    parentId: input.parentId,
    householdId: input.householdId,
    childProfileId: input.childProfileId,
  });
  return { candidate, run, parentState, candidateState };
}

function extractNarrative(payload: JsonObject): string {
  const direct = firstString(payload, ["narrative", "text", "content", "body"]);
  if (direct) return direct;
  const scene = payload.scene;
  if (scene && typeof scene === "object" && !Array.isArray(scene)) {
    const nested = firstString(scene as JsonObject, [
      "narrative",
      "text",
      "content",
      "body",
    ]);
    if (nested) return nested;
  }
  return JSON.stringify(payload);
}

function firstString(object: JsonObject, keys: string[]): string | null {
  for (const key of keys) {
    const value = object[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function evaluationMode(value: unknown): EvaluationMode {
  if (value === "absolute" || value === "blind_ranking") return value;
  return "absolute";
}

function evaluationFindings(value: unknown): EvaluationFinding[] {
  if (!Array.isArray(value)) {
    throw new Error("TEST_LAB_EVALUATION_FINDINGS_REQUIRED");
  }
  return value.map((item) => {
    if (
      !item ||
      typeof item !== "object" ||
      Array.isArray(item) ||
      typeof (item as Record<string, unknown>).criterionKey !== "string" ||
      typeof (item as Record<string, unknown>).score !== "number" ||
      typeof (item as Record<string, unknown>).finding !== "string"
    ) {
      throw new Error("TEST_LAB_EVALUATION_INVALID_FINDING");
    }
    const record = item as Record<string, unknown>;
    return {
      criterionKey: record.criterionKey as string,
      score: record.score as number,
      finding: record.finding as string,
      evidence: typeof record.evidence === "string" ? record.evidence : null,
    };
  });
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`TEST_LAB_REQUIRED_FIELD:${field}`);
  }
  return value.trim();
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function positiveInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error("TEST_LAB_POSITIVE_INTEGER_REQUIRED");
  }
  return value;
}

function optionalPositiveInteger(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  return positiveInteger(value);
}

function stringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`TEST_LAB_STRING_ARRAY_REQUIRED:${field}`);
  }
  const items = value.map((item) => requiredString(item, field));
  if (new Set(items).size !== items.length) {
    throw new Error(`TEST_LAB_DUPLICATE_VALUES:${field}`);
  }
  return items;
}
