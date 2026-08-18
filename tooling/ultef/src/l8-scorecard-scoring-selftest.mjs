import assert from "node:assert/strict";
import fs from "node:fs";
import prettier from "prettier";
import {
  L8_SCORECARD_PERFORMANCE_PROFILE,
  linearPerformanceScore,
  scorePerformance,
} from "./l8-scorecard-scoring.mjs";

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

const target =
  "packages/profiles/src/application/ai-generation-trace.service.ts";
const source = fs.readFileSync(target, "utf8");
const formatted = await prettier.format(source, {
  filepath: target,
});
console.log(`TRACE_SERVICE_PRETTIER_JSON=${JSON.stringify(formatted)}`);
console.log("L8 scorecard performance scoring selftest: PASS");
