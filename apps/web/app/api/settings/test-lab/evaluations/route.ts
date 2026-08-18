import { NextResponse } from "next/server";

import { getAiDb } from "@lumi/ai/db/client";
import {
  DrizzleEvaluationRepository,
  DrizzleTestLabRepository,
  EvaluationRunner,
  STORY_QUALITY_RUBRIC_V1,
  summarizeJudgeConsensus,
  type EvaluationFinding,
  type EvaluationMode,
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
    const childProfileId = requiredString(body.childProfileId, "childProfileId");
    const { testLabRepository, evaluationRepository, runner } = services();

    try {
      await ensureStoryRubric(evaluationRepository);

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

      if (action === "save-human") {
        const [candidate] = await loadOwnedCandidates({
          candidateIds: [requiredString(body.candidateId, "candidateId")],
          parentId: parent.id,
          householdId,
          childProfileId,
          testLabRepository,
        });
        if (!candidate) throw new Error("TEST_LAB_EVALUATION_CANDIDATE_NOT_FOUND");
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
        await loadOwnedCandidates({
          candidateIds,
          parentId: parent.id,
          householdId,
          childProfileId,
          testLabRepository,
        });
        const candidates = await Promise.all(
          candidateIds.map(async (candidateId) => {
            const evaluations =
              await evaluationRepository.listCandidateEvaluations(candidateId);
            const executions = await Promise.all(
              [...new Set(evaluations.map((item) => item.evaluationExecutionId))].map(
                (id) => evaluationRepository.getExecution(id),
              ),
            );
            return {
              candidateId,
              evaluations,
              executions: executions.filter(Boolean),
              judgeConsensus: summarizeJudgeConsensus(candidateId, evaluations),
            };
          }),
        );
        return NextResponse.json({ data: { candidates } });
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

async function ensureStoryRubric(
  repository: DrizzleEvaluationRepository,
): Promise<void> {
  if (await repository.getRubric("story_quality", 1)) return;
  try {
    await repository.saveRubric(STORY_QUALITY_RUBRIC_V1);
  } catch {
    if (!(await repository.getRubric("story_quality", 1))) throw new Error("TEST_LAB_EVALUATION_RUBRIC_SEED_FAILED");
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
      const candidate = await input.testLabRepository.getCandidate(candidateId);
      if (!candidate) {
        throw new Error(`TEST_LAB_CANDIDATE_NOT_FOUND:${candidateId}`);
      }
      const run = await input.testLabRepository.getRun(candidate.runId);
      if (!run) throw new Error(`TEST_LAB_RUN_NOT_FOUND:${candidate.runId}`);
      const parentState = await input.testLabRepository.getState(run.parentStateId);
      assertSandboxOwner(parentState, {
        parentId: input.parentId,
        householdId: input.householdId,
        childProfileId: input.childProfileId,
      });
      return {
        sessionId: candidate.sessionId,
        runId: candidate.runId,
        candidateId: candidate.id,
        payload: candidate.payload,
      };
    }),
  );
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
