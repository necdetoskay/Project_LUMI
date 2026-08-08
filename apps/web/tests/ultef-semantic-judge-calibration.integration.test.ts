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

ultefDescribe("ULTEF L8-SEMANTIC-JUDGE-CALIBRATION-001", () => {
  it("compares one live semantic judge against the human-reference seed set", async () => {
    const dataset = JSON.parse(
      await readFile(
        new URL(
          "../../../tooling/ultef/calibration/l8-semantic-calibration.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as {
      id: string;
      status: string;
      examples: Array<{
        id: string;
        rubric: string;
        humanScore: number;
        text: string;
      }>;
    };

    const scenario = createScenario({
      id: "L8-SEMANTIC-JUDGE-CALIBRATION-001",
      title:
        "Calibrate the advisory semantic judge against human-reference examples",
      level: "L8",
      projectGate: "PX-LUMI-09",
      seed: dataset.id,
    });

    scenario.setup("Calibration dataset", {
      id: dataset.id,
      status: dataset.status,
      exampleCount: dataset.examples.length,
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
    const evaluation = evaluateSemanticCalibration(
      dataset.examples,
      predictions,
    );

    scenario.event(
      "semantic.calibration.metrics",
      `Judge ${response.model} calibration: MAE=${evaluation.mae}, within-one=${Math.round(
        evaluation.withinOneRate * 100,
      )}%, eligible=${evaluation.eligible}.`,
      {
        judgeModel: response.model,
        datasetId: dataset.id,
        datasetStatus: dataset.status,
        evaluation,
        latencyMs,
        usage: response.usage,
      },
    );

    for (const [rubric, result] of Object.entries(evaluation.rubrics)) {
      scenario.event(
        "semantic.calibration.rubric",
        `${rubric}: MAE=${result.mae}, within-one=${Math.round(
          result.withinOneRate * 100,
        )}%.`,
        { rubric, ...result },
      );
    }

    const report = scenario.finish({
      result: "PASS",
      reason: evaluation.eligible
        ? "The live semantic judge met the seed calibration thresholds. It remains advisory-only until the seed labels receive explicit human review."
        : "Calibration completed, but the live semantic judge did not meet the seed thresholds and remains untrusted/advisory-only.",
    });

    await writeScenarioArtifacts(report, {
      environment: "live-openrouter-opt-in-l8-semantic-calibration",
    });

    expect(report.result).toBe("PASS");
    expect(dataset.examples).toHaveLength(18);
  }, 90_000);
});
