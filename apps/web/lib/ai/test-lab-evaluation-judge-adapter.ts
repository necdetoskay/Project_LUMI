import "server-only";

import {
  estimateRunCostUsd,
  OpenRouterModelCatalog,
  type EvaluationJudgeAdapter,
  type EvaluationJudgeRequest,
  type EvaluationJudgeResult,
  type JsonObject,
} from "@lumi/ai/test-lab";

import { generateText } from "./text-generation/gateway";

export const testLabEvaluationJudgeAdapter: EvaluationJudgeAdapter = {
  async evaluate(request) {
    const catalog = await new OpenRouterModelCatalog().resolveModelProfile({
      modelSlug: request.judgeModelSlug,
      capturedAt: new Date().toISOString(),
    });
    const response = await generateText({
      purpose: "test_lab_evaluation",
      provider: "openrouter",
      model: request.judgeModelSlug,
      system: buildSystemPrompt(request),
      user: JSON.stringify({ candidates: request.candidates }),
      generationConfig: {
        temperature: 0,
        response_format: { type: "json_object" },
      },
    });
    const parsed = asJudgePayload(response.parsedJson);
    const promptTokens = response.usage.inputTokens ?? 0;
    const completionTokens = response.usage.outputTokens ?? 0;
    const totalTokens = response.usage.totalTokens ?? promptTokens + completionTokens;
    const estimatedCostUsd = estimateRunCostUsd({
      pricing: catalog.pricing,
      promptTokens,
      completionTokens,
    });

    return {
      judgeId: `openrouter:${request.judgeModelSlug}`,
      judgeModelSlug: response.model,
      candidates: parsed.candidates,
      usageSnapshot: {
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCostUsd,
        actualCostUsd: response.estimatedCostUsd,
        latencyMs: response.latencyMs,
      },
      provenance: {
        provider: response.provider,
        requestedModelSlug: request.judgeModelSlug,
        resolvedModelSlug: response.model,
        rubricKey: request.rubric.key,
        rubricRevision: request.rubric.revision,
        blind: true,
        pricingSource: catalog.pricing.source,
        pricingCapturedAt: catalog.pricing.capturedAt,
        costBasis: "catalog_estimate_plus_provider_reported_actual",
      },
    } satisfies EvaluationJudgeResult;
  },
};

function buildSystemPrompt(request: EvaluationJudgeRequest): string {
  return [
    "You are the LUMI Test Lab evaluation judge.",
    "Evaluate only the blind candidate labels and content provided.",
    "Do not infer or guess which model generated a candidate.",
    "Return JSON only.",
    `Mode: ${request.mode}`,
    `Rubric: ${request.rubric.key}@${request.rubric.revision}`,
    "Every candidate must have one result.",
    "For every rubric criterion return a score, a short concrete finding, and optional evidence.",
    request.mode === "blind_ranking"
      ? "Also rank all candidates with unique positive integer ranks where 1 is best."
      : "Set rank to null for absolute mode.",
    `Criteria: ${JSON.stringify(request.rubric.criteria)}`,
    'Required shape: {"candidates":[{"candidateLabel":"Candidate A","findings":[{"criterionKey":"creativity","score":8,"finding":"short finding","evidence":"short evidence or null"}],"rank":1}]}',
  ].join("\n");
}

function asJudgePayload(value: unknown): {
  candidates: EvaluationJudgeResult["candidates"];
} {
  if (!isObject(value) || !Array.isArray(value.candidates)) {
    throw new Error("TEST_LAB_EVALUATION_INVALID_JUDGE_OUTPUT");
  }
  const candidates = value.candidates.map((item) => {
    if (!isObject(item) || typeof item.candidateLabel !== "string") {
      throw new Error("TEST_LAB_EVALUATION_INVALID_JUDGE_CANDIDATE");
    }
    if (!Array.isArray(item.findings)) {
      throw new Error("TEST_LAB_EVALUATION_INVALID_JUDGE_FINDINGS");
    }
    return {
      candidateLabel: item.candidateLabel,
      findings: item.findings.map((finding) => {
        if (
          !isObject(finding) ||
          typeof finding.criterionKey !== "string" ||
          typeof finding.score !== "number" ||
          typeof finding.finding !== "string"
        ) {
          throw new Error("TEST_LAB_EVALUATION_INVALID_JUDGE_FINDING");
        }
        return {
          criterionKey: finding.criterionKey,
          score: finding.score,
          finding: finding.finding,
          evidence:
            typeof finding.evidence === "string" ? finding.evidence : null,
        };
      }),
      rank:
        typeof item.rank === "number" && Number.isInteger(item.rank)
          ? item.rank
          : null,
    };
  });
  return { candidates };
}

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
