import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { renderBoundaryHumanReview } from "./l8-boundary-human-review.mjs";

const dataset = JSON.parse(
  await readFile(
    new URL(
      "../calibration/l8-semantic-calibration-hard-boundary.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

const rows = dataset.examples.map((example) => ({
  id: example.id,
  rubric: example.rubric,
  humanScore: example.humanScore,
  predictedScore: Math.min(5, example.humanScore + 1),
  absoluteError: 1,
  signedError: 1,
  withinOne: true,
}));

const markdown = renderBoundaryHumanReview({
  dataset,
  judgeModel: "test/judge",
  calibration: {
    mae: 1,
    withinOneRate: 1,
    meanBias: 1,
    directionCounts: { under: 0, exact: 0, over: 18 },
    rows,
  },
});

assert.match(markdown, /L8 Semantic Boundary Human Review/);
assert.match(markdown, /choice-boundary-4a/);
assert.match(
  markdown,
  /Arin, Mira'nın daha önce anlattığı köprü işaretini hatırladı/,
);
assert.match(markdown, /\| 4 \| 5 \|  \| pending \|/);
assert.match(markdown, /Mean signed bias: \*\*1\*\*/);
assert.match(markdown, /under=0, exact=0, over=18/);
assert.equal(
  (markdown.match(/\| `(?:choice|personality|age)-boundary-/g) ?? []).length,
  18,
);

console.log("L8 boundary human review renderer selftest: PASS");
