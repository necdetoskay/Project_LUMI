import { readFile } from "node:fs/promises";

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
const ultefDescribe =
  enabled && apiKey && judgeModel ? describe : describe.skip;

ultefDescribe("ULTEF L8-SEMANTIC-CALIBRATION-001", () => {
  it("compares one live batch judge call against the seed human-reference set", async () => {
    const dataset = JSON.parse(
      await readFile(
        new URL(
          "../../../tooling/ultef/calibration/l8-semantic-calibration.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );

    const scenario = createScenario({
      id: "L8-SEMANTIC-CALIBRATION-001",
      title: "Semantic judge calibration against seed human references",
      level: "L8",
      projectGate: "PX-LUMI-09",
      seed: "semantic-calibration-seed-v1",
    });
    scenario.setup("Calibration dataset", {
      id: dataset.id,
      status: dataset.status,
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
        judgeModel: response.model,
        latencyMs,
        usage: response.usage,
        calibration,
      },
    );
    scenario.assert(
      "Judge meets seed calibration thresholds",
      calibration.eligible,
      true,
      calibration,
    );

    const report = scenario.finish({
      result: calibration.eligible ? "PASS" : "FAIL",
      reason: calibration.eligible
        ? "The semantic judge met the seed-reference MAE, within-one, and per-rubric error thresholds. It remains advisory until the seed labels receive explicit human review."
        : "The semantic judge did not meet the seed-reference calibration thresholds and must remain advisory-only.",
    });
    await writeScenarioArtifacts(report, {
      environment: "live-openrouter-opt-in-semantic-calibration",
    });

    expect(report.result).toBe("PASS");
  }, 60_000);
});
