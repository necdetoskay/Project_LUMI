import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

const traceViewPath =
  "apps/web/app/app/settings/context-inspector/traces/traces-client-page.tsx";
const source = await readFile(traceViewPath, "utf8");
const formatted = await prettier.format(source, { filepath: traceViewPath });
let firstDiff = -1;
for (let index = 0; index < Math.max(source.length, formatted.length); index += 1) {
  if (source[index] !== formatted[index]) {
    firstDiff = index;
    break;
  }
}
console.log(
  "TRACE_PRETTIER_DIFF=" +
    JSON.stringify({
      equal: source === formatted,
      firstDiff,
      sourceLength: source.length,
      formattedLength: formatted.length,
      sourceAround: source.slice(Math.max(0, firstDiff - 120), firstDiff + 240),
      formattedAround: formatted.slice(
        Math.max(0, firstDiff - 120),
        firstDiff + 240,
      ),
    }),
);

console.log("L8 scorecard performance scoring selftest: PASS");
