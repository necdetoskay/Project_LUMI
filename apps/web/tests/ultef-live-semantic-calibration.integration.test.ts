import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { callOpenRouter } from "@lumi/profiles/application";

import { writeScenarioArtifacts } from "../../../tooling/ultef/src/artifacts.mjs";
import { createScenario } from "../../../tooling/ultef/src/evidence.mjs";
import { renderBoundaryHumanReview } from "../../../tooling/ultef/src/l8-boundary-human-review.mjs";
import {
  buildSemanticCalibrationJudgePrompt,
  evaluateSemanticCalibration,
  parseSemanticCalibrationJudgeResponse,
} from "../../../tooling/ultef/src/l8-semantic-calibration.mjs";
import { evaluateSemanticCalibrationStability } from "../../../tooling/ultef/src/l8-semantic-calibration-stability.mjs";

const enabled = process.env.ULTEF_L8_SEMANTIC_CALIBRATION_ENABLED === "true";
const apiKey = process.env.OPENROUTER_API_KEY;
const judgeModel = process.env.ULTEF_L8_JUDGE_MODEL;
const calibrationSet = process.env.ULTEF_L8_CALIBRATION_SET ?? "seed";
const repeatCount = parseRepeatCount(
  process.env.ULTEF_L8_CALIBRATION_REPEATS ?? "1",
);
const ultefDescribe =
  enabled && apiKey && judgeModel ? describe : describe.skip;

const calibrationConfigs = {
  seed: {
    file: "l8-semantic-calibration.json",
    scenarioId: "L8-SEMANTIC-CALIBRATION-001",
    title: "Semantic judge calibration against seed human references",
    seed: "semantic-calibration-seed-v1",
    environment: "live-openrouter-opt-in-semantic-calibration",
    assertion: "Judge meets seed calibration thresholds",
  },
  "hard-boundary": {
    file: "l8-semantic-calibration-hard-boundary.json",
    scenarioId: "L8-SEMANTIC-CALIBRATION-BOUNDARY-001",
    title: "Semantic judge hard-boundary challenge",
    seed: "semantic-calibration-hard-boundary-v1",
    environment: "live-openrouter-opt-in-semantic-boundary-challenge",
    assertion: "Judge meets hard-boundary challenge thresholds",
  },
  "human-reviewed-boundary-v1": {
    file: "l8-semantic-calibration-human-reviewed-boundary-v1.json",
    scenarioId: "L8-SEMANTIC-CALIBRATION-HUMAN-BOUNDARY-001",
    title: "Semantic judge calibration against human-reviewed boundary v1",
    seed: "semantic-calibration-human-reviewed-boundary-v1",
    environment: "live-openrouter-opt-in-human-reviewed-boundary",
    assertion: "Judge meets human-reviewed boundary calibration thresholds",
  },
} as const;

ultefDescribe("ULTEF L8 semantic calibration", () => {
  it("compares repeated live batch judge calls against the selected reference set", async () => {
    const config =
      calibrationConfigs[calibrationSet as keyof typeof calibrationConfigs];
    if (!config) {
      throw new Error(
        `Unsupported ULTEF_L8_CALIBRATION_SET=${calibrationSet}; expected seed, hard-boundary, or human-reviewed-boundary-v1.`,
      );
    }

    const datasetPath = path.resolve(
      process.cwd(),
      "../../tooling/ultef/calibration",
      config.file,
    );
    const dataset = JSON.parse(await readFile(datasetPath, "utf8"));

    const scenario = createScenario({
      id: config.scenarioId,
      title: config.title,
      level: "L8",
      projectGate: "PX-LUMI-09",
      seed: config.seed,
    });
    scenario.setup("Calibration dataset", {
      id: dataset.id,
      status: dataset.status,
      humanReview: dataset.humanReview ?? "unspecified",
      examples: dataset.examples.length,
    });
    scenario.setup("Judge model", { model: judgeModel });
    scenario.setup("Calibration repeats", { repeats: repeatCount });

    const calibrations = [];
    let responseModel = judgeModel!;
    let totalLatencyMs = 0;
    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;

    for (let repeat = 1; repeat <= repeatCount; repeat += 1) {
      const startedAt = Date.now();
      const response = await callOpenRouter(apiKey!, {
        model: judgeModel!,
        messages: [
          {
            role: "user",
            content: buildSemanticCalibrationJudgePrompt(dataset.examples),
          },
        ],
        temperature: 0,
        maxTokens: 1200,
      });
      const latencyMs = Date.now() - startedAt;
      const predictions = parseSemanticCalibrationJudgeResponse(
        response.content,
        dataset.examples,
      );
      const calibration = evaluateSemanticCalibration(
        dataset.examples,
        predictions,
      );

      responseModel = response.model;
      totalLatencyMs += latencyMs;
      promptTokens += response.usage?.promptTokens ?? 0;
      completionTokens += response.usage?.completionTokens ?? 0;
      totalTokens += response.usage?.totalTokens ?? 0;
      calibrations.push(calibration);

      scenario.event(
        "semantic.calibration.repeat.completed",
        `Repeat ${repeat}/${repeatCount} — Judge ${response.model}: MAE=${calibration.mae}, bias=${calibration.meanBias}, within-one=${Math.round(calibration.withinOneRate * 100)}%.`,
        {
          repeat,
          repeatCount,
          calibrationSet,
          judgeModel: response.model,
          latencyMs,
          usage: response.usage,
          calibration,
        },
      );
    }

    const stability = evaluateSemanticCalibrationStability(calibrations);
    const individualPass = calibrations.every((item) => item.eligible);
    const passed = repeatCount === 1 ? individualPass : stability.stable;

    scenario.event(
      "semantic.calibration.stability.completed",
      `Stability: pass-rate=${Math.round(stability.passRate * 100)}%, mean-MAE=${stability.meanMae}, MAE-sd=${stability.maeStdDev}, bias-sd=${stability.biasStdDev}.`,
      {
        calibrationSet,
        datasetId: dataset.id,
        datasetStatus: dataset.status,
        humanReview: dataset.humanReview ?? null,
        judgeModel: responseModel,
        repeatCount,
        totalLatencyMs,
        usage: { promptTokens, completionTokens, totalTokens },
        stability,
      },
    );
    scenario.assert(
      repeatCount === 1
        ? config.assertion
        : "Judge meets repeated calibration stability thresholds",
      passed,
      true,
      repeatCount === 1 ? calibrations[0] : stability,
    );

    const isHumanReviewed =
      dataset.humanReview === "approved" || dataset.humanReview === "complete";
    const report = scenario.finish({
      result: passed ? "PASS" : "FAIL",
      reason: passed
        ? repeatCount > 1
          ? "The semantic judge met repeated human-reviewed calibration stability thresholds. Semantic scoring remains subordinate to deterministic hard gates."
          : isHumanReviewed
            ? "The semantic judge met the selected human-reviewed calibration thresholds. Semantic scoring remains subordinate to deterministic hard gates."
            : "The semantic judge met the selected numerical thresholds, but the reference labels are not human-approved and cannot grant ranking authority."
        : repeatCount > 1
          ? "The semantic judge did not meet repeated calibration stability thresholds and must remain advisory-only."
          : "The semantic judge did not meet the selected reference thresholds and must remain advisory-only.",
    });
    const artifacts = await writeScenarioArtifacts(report, {
      environment: config.environment,
    });

    if (calibrationSet !== "seed") {
      const humanReview = renderBoundaryHumanReview({
        dataset,
        calibration: calibrations.at(-1),
        judgeModel: responseModel,
      });
      await writeFile(
        path.join(artifacts.runDir, "L8-SEMANTIC-BOUNDARY-HUMAN-REVIEW.md"),
        humanReview,
        "utf8",
      );
    }

    expect(report.result).toBe("PASS");
  }, 120_000);
});

function parseRepeatCount(raw: string): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new Error(
      "ULTEF_L8_CALIBRATION_REPEATS must be an integer from 1 to 5.",
    );
  }
  return value;
}
