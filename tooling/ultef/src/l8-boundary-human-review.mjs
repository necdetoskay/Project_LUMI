export function renderBoundaryHumanReview({ dataset, calibration, judgeModel }) {
  const rows = Array.isArray(calibration?.rows) ? calibration.rows : [];
  const predictionById = new Map(
    rows.map((row) => [row.id, row.predictedScore]),
  );

  const lines = [
    "# L8 Semantic Boundary Human Review",
    "",
    `Dataset: \`${dataset.id}\``,
    `Dataset status: \`${dataset.status}\``,
    `Human review: \`${dataset.humanReview ?? "pending"}\``,
    `Judge model: \`${judgeModel ?? "not-recorded"}\``,
    "",
    "## Review instructions",
    "",
    "Read the story text and choose your own 0-5 score before treating the architect or judge score as authoritative. The architect score is a challenge reference, not ground truth. The judge score is advisory only. Adjacent disagreement is expected and is the main signal this review is designed to capture.",
    "",
    "For each row, fill **Human** and **Decision/notes**. Use `accept`, `relabel`, or `rewrite` as the decision when possible.",
    "",
  ];

  for (const [rubric, title, question] of RUBRIC_SECTIONS) {
    lines.push(`## ${title}`, "", question, "");
    lines.push(
      "| ID | Story text | Architect | Judge | Human | Decision / notes |",
      "| --- | --- | ---: | ---: | ---: | --- |",
    );

    for (const example of dataset.examples.filter(
      (item) => item.rubric === rubric,
    )) {
      const predicted = predictionById.get(example.id);
      lines.push(
        `| \`${escapeCell(example.id)}\` | ${escapeCell(example.text)} | ${example.humanScore} | ${predicted ?? "-"} |  | pending |`,
      );
    }
    lines.push("");
  }

  lines.push(
    "## Calibration snapshot",
    "",
    calibration
      ? `- Overall MAE: **${calibration.mae}**`
      : "- Overall MAE: not available",
    calibration
      ? `- Within-one accuracy: **${Math.round(calibration.withinOneRate * 100)}%**`
      : "- Within-one accuracy: not available",
    calibration?.meanBias !== undefined
      ? `- Mean signed bias: **${calibration.meanBias}**`
      : "- Mean signed bias: not available",
    calibration?.directionCounts
      ? `- Direction counts: under=${calibration.directionCounts.under}, exact=${calibration.directionCounts.exact}, over=${calibration.directionCounts.over}`
      : "- Direction counts: not available",
    "",
    "## Promotion checklist",
    "",
    "- [ ] All 18 rows have an independent human score.",
    "- [ ] Every architect/human disagreement has a recorded decision.",
    "- [ ] Rows marked `rewrite` have been replaced and re-reviewed.",
    "- [ ] Dataset JSON has been updated to the accepted human labels.",
    "- [ ] `humanReview` is `approved` and status is versioned as `human-reviewed-boundary-v1` or later.",
    "- [ ] Hard-boundary calibration has been rerun against the frozen human-reviewed set.",
    "",
    "Semantic judge results remain advisory and subordinate to deterministic continuity, world-consistency, and child-safety gates.",
    "",
  );

  return lines.join("\n");
}

const RUBRIC_SECTIONS = [
  [
    "choice_influence",
    "Choice influence",
    "Review question: how much must the earlier choice causally change the next story before remembered context becomes meaningful influence?",
  ],
  [
    "personality_emotion",
    "Personality and emotion",
    "Review question: where does shallow reassurance or mild impatience become sufficiently inconsistent with Bora's calm, supportive, cautious characterization?",
  ],
  [
    "age_appropriateness",
    "Age appropriateness",
    "Review question: how much technical vocabulary remains comfortable for ages 6-8 when concrete actions and experiments provide context?",
  ],
];

function escapeCell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}
