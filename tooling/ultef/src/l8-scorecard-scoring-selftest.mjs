import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { format } from "prettier";
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

for (const path of [
  "apps/web/app/app/settings/context-inspector/traces/traces-client-page.tsx",
  "packages/profiles/src/application/ai-generation-trace.service.test.ts",
]) {
  const input = await readFile(path, "utf8");
  const parser = path.endsWith(".tsx") ? "typescript" : "typescript";
  const output = await format(input, { parser });
  console.log(`PRETTIER_OUTPUT:${path}:${JSON.stringify(output)}`);
}

console.log("L8 scorecard performance scoring selftest: PASS");
