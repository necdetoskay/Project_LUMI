import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { callOpenRouter } from "@lumi/profiles/application";

import { createScenario } from "../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../tooling/ultef/src/artifacts.mjs";
import {
  buildSemanticCalibrationJudgePrompt,
  evaluateSemanticCalibration,
  parseSemanticCalibrationJudgeResponse,
} from "../../../tooling/ultef/src/l8-semantic-calibration.mjs";

const enabled = process.env.ULTEF_L8_SEMANTIC_CALIBRATION_ENABLED === "true";
const apiKey = process.env.OPENROUTER_API_KEY;
const judgeModel = process.env.ULTEF_L8_JUDGE_MODEL;
const calibrationSet = process.env.ULTEF_L8_CALIBRATION_SET ?? "seed";
const ultefDescribe = enabled && apiKey && judgeModel ? describe : describe.skip;

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
} as const;

ultefDescribe("ULTEF L8 semantic calibration", () => {
  it("compares one live batch judge call against the selected reference set", async () => {
    const config =
      calibrationConfigs[calibrationSet as keyof typeof calibrationConfigs];
    if (!config) {
      throw new Error(
        `Unsupported ULTEF_L8_CALIBRATION_SET=${calibrationSet}; expected seed or hard-boundary.`,
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

    scenario.event(
      "semantic.calibration.completed",
      `Judge ${response.model}: MAE=${calibration.mae}, within-one=${Math.round(calibration.withinOneRate * 100)}%.`,
      {
        calibrationSet,
        datasetId: dataset.id,
        datasetStatus: dataset.status,
        humanReview: dataset.humanReview ?? null,
        judgeModel: response.model,
        latencyMs,
        usage: response.usage,
        calibration,
      },
    );
    scenario.assert(
      config.assertion,
      calibration.eligible,
      true,
      calibration,
    );

    const isHumanReviewed = dataset.humanReview === "approved";
    const report = scenario.finish({
      result: calibration.eligible ? "PASS" : "FAIL",
      reason: calibration.eligible
        ? isHumanReviewed
          ? "The semantic judge met the selected human-reviewed calibration thresholds. Semantic scoring remains subordinate to deterministic hard gates."
          : "The semantic judge met the selected numerical thresholds, but the reference labels are not human-approved and cannot grant ranking authority."
        : "The semantic judge did not meet the selected reference thresholds and must remain advisory-only.",
    });
    await writeScenarioArtifacts(report, {
      environment: config.environment,
    });

    expect(report.result).toBe("PASS");
  }, 60_000);
});
