import { NextResponse } from "next/server";

import { getAiDb } from "@lumi/ai/db/client";
import {
  CHARACTER_GENESIS_QUALITY_RUBRIC_V1,
  DrizzleEvaluationRepository,
  DrizzleTestLabRepository,
  EvaluationRunner,
  summarizeJudgeConsensus,
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
    NextResponse.json({ data: { rubric: CHARACTER_GENESIS_QUALITY_RUBRIC_V1 } }),
  );
}, "/api/settings/test-lab/genesis/evaluations");

export const POST = observeHandler(async (request: Request) => {
  return withParent(async (parent) => {
    const body = (await readRequestBody(request)) as Record<string, unknown>;
    const action = requiredString(body.action, "action");
    const householdId = requiredString(body.householdId, "householdId");
    const childProfileId = requiredString(body.childProfileId, "childProfileId");
    const { testLabRepository, evaluationRepository, runner } = services();

    try {
      await ensureRubric(evaluationRepository);
      const candidateIds = stringArray(body.candidateIds, "candidateIds");
      const candidates = await Promise.all(
        candidateIds.map(async (candidateId) => {
          const candidate = await testLabRepository.getCandidate(candidateId);
          if (!candidate) {
            throw new Error(`TEST_LAB_CANDIDATE_NOT_FOUND:${candidateId}`);
          }
          const run = await testLabRepository.getRun(candidate.runId);
          if (!run) throw new Error(`TEST_LAB_RUN_NOT_FOUND:${candidate.runId}`);
          const parentState = await testLabRepository.getState(run.parentStateId);
          assertSandboxOwner(parentState, {
            parentId: parent.id,
            householdId,
            childProfileId,
          });
          return {
            sessionId: candidate.sessionId,
            runId: candidate.runId,
            candidateId: candidate.id,
            payload: candidate.payload,
          };
        }),
      );

      if (action === "run-judge") {
        const result = await runner.runJudgeEvaluation({
          rubricKey: CHARACTER_GENESIS_QUALITY_RUBRIC_V1.key,
          rubricRevision: CHARACTER_GENESIS_QUALITY_RUBRIC_V1.revision,
          mode: "blind_ranking",
          judgeModelSlug: requiredString(body.judgeModelSlug, "judgeModelSlug"),
          candidates,
        });
        return NextResponse.json({ data: result });
      }

      if (action === "inspect") {
        const inspection = await Promise.all(
          candidates.map(async (candidate) => {
            const evaluations =
              await evaluationRepository.listCandidateEvaluations(
                candidate.candidateId,
              );
            return {
              candidateId: candidate.candidateId,
              evaluations,
              judgeConsensus: summarizeJudgeConsensus(
                candidate.candidateId,
                evaluations,
              ),
            };
          }),
        );
        return NextResponse.json({ data: { candidates: inspection } });
      }

      throw new Error(`TEST_LAB_GENESIS_EVALUATION_UNKNOWN_ACTION:${action}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json(
        { error: "TEST_LAB_GENESIS_EVALUATION_ERROR", message },
        { status: message.includes("FORBIDDEN") ? 403 : 400 },
      );
    }
  });
}, "/api/settings/test-lab/genesis/evaluations");

async function ensureRubric(repository: DrizzleEvaluationRepository) {
  const rubric = CHARACTER_GENESIS_QUALITY_RUBRIC_V1;
  if (await repository.getRubric(rubric.key, rubric.revision)) return;
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

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`TEST_LAB_REQUIRED_FIELD:${field}`);
  }
  return value.trim();
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
