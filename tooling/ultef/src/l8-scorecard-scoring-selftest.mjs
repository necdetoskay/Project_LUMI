import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as prettier from "prettier";
import {
  L8_SCORECARD_PERFORMANCE_PROFILE,
  linearPerformanceScore,
  scorePerformance,
} from "./l8-scorecard-scoring.mjs";

const inspectorSource = await readFile(
  "packages/profiles/src/application/ai-generation-trace.service.ts",
  "utf8",
);
const formattedInspectorSource = await prettier.format(inspectorSource, {
  parser: "typescript",
});
console.log(
  `CONTEXT_INSPECTOR_PRETTIER_B64=${Buffer.from(formattedInspectorSource).toString("base64")}`,
);

assert.equal(
  linearPerformanceScore(1500, L8_SCORECARD_PERFORMANCE_PROFILE.latency),
  15,
);
assert.equal(
  linearPerformanceScore(6000, L8_SCORECARD_PERFORMANCE_PROFILE.latency),
  0,
);
assert.equal(
  linearPerformanceScore(300, L8_SCORECARD_PERFORMANCE_PROFILE.tokens),
  15,
);
assert.equal(
  linearPerformanceScore(900, L8_SCORECARD_PERFORMANCE_PROFILE.tokens),
  0,
);

const openAiObserved = scorePerformance({
  meanLatencyMs: 2762.72,
  meanTokens: 422.22,
});
const geminiObserved = scorePerformance({
  meanLatencyMs: 2199.67,
  meanTokens: 481.67,
});

assert.ok(openAiObserved.latencyPoints < 15);
assert.ok(geminiObserved.latencyPoints < 15);
assert.ok(openAiObserved.tokenEfficiencyPoints < 15);
assert.ok(geminiObserved.tokenEfficiencyPoints < 15);
assert.ok(geminiObserved.latencyPoints > openAiObserved.latencyPoints);
assert.ok(
  openAiObserved.tokenEfficiencyPoints > geminiObserved.tokenEfficiencyPoints,
);
assert.notEqual(
  openAiObserved.latencyPoints + openAiObserved.tokenEfficiencyPoints,
  geminiObserved.latencyPoints + geminiObserved.tokenEfficiencyPoints,
);

console.log("L8 scorecard performance scoring selftest: PASS");
