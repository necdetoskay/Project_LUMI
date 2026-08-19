import { and, desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import {
  getAiDb,
  testLabCandidateEvaluations,
  testLabEvaluationExecutions,
  testLabEvaluationRubrics,
  testLabRuns,
  testLabStateSnapshots,
} from "@lumi/ai/db";
import type {
  EvaluationCriterion,
  EvaluationFinding,
  JsonObject,
  TestRunExecutionSnapshot,
} from "@lumi/ai/test-lab";
import {
  createPromptDraftFromVersion,
  getLlmSettings,
  getPromptWorkspace,
} from "@lumi/profiles/application";
import {
  appendPromptImprovementBlock,
  buildPromptImprovementPlan,
} from "@/lib/ai/test-lab-prompt-improvement";
import { withParent } from "@/lib/auth/with-parent";
import { readRequestBody } from "@/lib/http/request-body";
import { observeHandler } from "@/lib/observability/observed-api-route";

const OWNER_KEY = "__testLabOwner";
const ROUTE = "/api/settings/test-lab/prompt-optimization";

export const GET = observeHandler(() => {
  return withParent(async (parent) => {
    try {
      const context = await loadLatestOptimizationContext(parent.id);
      if (!context) {
        return NextResponse.json({
          data: {
            ready: false,
            message: "Prompt provenance içeren judge değerlendirmesi henüz yok.",
          },
        });
      }
      const plan = buildPromptImprovementPlan(context);
      if (!plan) {
        return NextResponse.json({
          data: {
            ready: false,
            message: "Judge değerlendirmesinde iyileştirilebilir kriter bulunamadı.",
          },
        });
      }
      return NextResponse.json({
        data: {
          ready: true,
          sourcePromptVersion: context.promptVersion,
          rubricLabel: context.rubricLabel,
          targetCriterion: {
            key: plan.targetCriterionKey,
            label: plan.targetCriterionLabel,
            score: plan.targetScore,
          },
          recommendation: plan.recommendation,
          details: plan.detailLines,
          preserveCriteria: plan.preserveCriteria,
        },
      });
    } catch (error) {
      return handleError(error);
    }
  });
}, ROUTE);

export const POST = observeHandler(async (request: Request) => {
  return withParent(async (parent) => {
    try {
      const body = (await readRequestBody(request)) as Record<string, unknown>;
      if (body.action !== "create-draft") {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message: "Unknown action" },
          { status: 400 },
        );
      }

      const context = await loadLatestOptimizationContext(parent.id);
      if (!context) {
        return NextResponse.json(
          {
            error: "NO_OPTIMIZATION_CONTEXT",
            message: "Prompt provenance içeren judge değerlendirmesi bulunamadı.",
          },
          { status: 409 },
        );
      }

      await getLlmSettings(parent.id, context.householdId);
      const plan = buildPromptImprovementPlan(context);
      if (!plan) {
        return NextResponse.json(
          {
            error: "NO_OPTIMIZATION_PLAN",
            message: "İyileştirilebilir kriter bulunamadı.",
          },
          { status: 409 },
        );
      }

      const workspace = await getPromptWorkspace(context.promptKey);
      const source =
        workspace.versions.find(
          (version) => version.version === context.promptVersion,
        ) ?? null;
      if (!source) {
        return NextResponse.json(
          {
            error: "PROMPT_SOURCE_NOT_FOUND",
            message: `Kaynak prompt revision v${context.promptVersion} bulunamadı.`,
          },
          { status: 409 },
        );
      }

      const draft = await createPromptDraftFromVersion(
        context.promptKey,
        source.version,
        {
          userTemplate: appendPromptImprovementBlock(
            source.userTemplate,
            plan.promptInstructionBlock,
          ),
        },
        {
          actorUserId: parent.id,
          reason: "test_lab_judge_improvement_draft",
          metadata: {
            source: "test_lab_canonical_dashboard",
            targetCriterion: plan.targetCriterionKey,
            sourcePromptVersion: source.version,
          },
        },
      );

      const refreshed = await getPromptWorkspace(context.promptKey);
      return NextResponse.json({
        data: {
          draftVersion: draft.version,
          sourcePromptVersion: source.version,
          activeVersion: refreshed.activeVersion?.version ?? null,
          productionChanged: false,
          targetCriterion: plan.targetCriterionLabel,
          message: `Draft v${draft.version} oluşturuldu. Production active prompt değiştirilmedi.`,
        },
      });
    } catch (error) {
      return handleError(error);
    }
  });
}, ROUTE);

type OptimizationContext = {
  findings: EvaluationFinding[];
  criteria: EvaluationCriterion[];
  rubricLabel: string;
  promptKey: string;
  promptVersion: number;
  householdId: string;
};

async function loadLatestOptimizationContext(
  parentId: string,
): Promise<OptimizationContext | null> {
  const db = getAiDb();
  const ownerFilter = sql`${testLabStateSnapshots.value} -> ${OWNER_KEY} ->> 'parentId' = ${parentId}`;
  const rows = await db
    .select({
      executionSnapshot: testLabRuns.executionSnapshot,
      stateValue: testLabStateSnapshots.value,
      findings: testLabCandidateEvaluations.findings,
      criteria: testLabEvaluationRubrics.criteria,
      rubricLabel: testLabEvaluationRubrics.label,
    })
    .from(testLabCandidateEvaluations)
    .innerJoin(
      testLabEvaluationExecutions,
      eq(
        testLabCandidateEvaluations.evaluationExecutionId,
        testLabEvaluationExecutions.id,
      ),
    )
    .innerJoin(testLabRuns, eq(testLabCandidateEvaluations.runId, testLabRuns.id))
    .innerJoin(
      testLabStateSnapshots,
      eq(testLabRuns.parentStateId, testLabStateSnapshots.id),
    )
    .innerJoin(
      testLabEvaluationRubrics,
      and(
        eq(
          testLabEvaluationRubrics.rubricKey,
          testLabCandidateEvaluations.rubricKey,
        ),
        eq(
          testLabEvaluationRubrics.revision,
          testLabCandidateEvaluations.rubricRevision,
        ),
      ),
    )
    .where(
      and(ownerFilter, eq(testLabCandidateEvaluations.authorType, "judge")),
    )
    .orderBy(desc(testLabEvaluationExecutions.createdAt))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  const execution = row.executionSnapshot as TestRunExecutionSnapshot | null;
  if (!execution?.promptKey || !execution.promptVersion) return null;
  const householdId = readHouseholdId(row.stateValue as JsonObject, parentId);

  return {
    findings: row.findings as EvaluationFinding[],
    criteria: row.criteria as EvaluationCriterion[],
    rubricLabel: row.rubricLabel,
    promptKey: execution.promptKey,
    promptVersion: execution.promptVersion,
    householdId,
  };
}

function readHouseholdId(state: JsonObject, parentId: string): string {
  const raw = state[OWNER_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("TEST_LAB_FORBIDDEN_SANDBOX");
  }
  const owner = raw as JsonObject;
  if (owner.parentId !== parentId || typeof owner.householdId !== "string") {
    throw new Error("TEST_LAB_FORBIDDEN_SANDBOX");
  }
  return owner.householdId;
}

function handleError(error: unknown): NextResponse {
  const err = error as Error & { name?: string };
  const message = err.message ?? "Unknown error";
  if (
    err.name === "AuthorizationError" ||
    message.includes("FORBIDDEN") ||
    message.includes("not a member")
  ) {
    return NextResponse.json({ error: "FORBIDDEN", message }, { status: 403 });
  }
  return NextResponse.json(
    { error: "PROMPT_OPTIMIZATION_ERROR", message },
    { status: 400 },
  );
}
