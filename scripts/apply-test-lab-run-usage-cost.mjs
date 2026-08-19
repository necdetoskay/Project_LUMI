import fs from "node:fs";

const path = "apps/web/app/app/settings/test-lab/onboarding-test-runner.tsx";
let source = fs.readFileSync(path, "utf8");

function replaceOnce(before, after, label) {
  if (!source.includes(before)) {
    throw new Error(`Missing expected source block: ${label}`);
  }
  source = source.replace(before, after);
}

replaceOnce(
`type UsageSnapshot = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;
};`,
`type UsageSnapshot = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  actualCostUsd: number | null;
  upstreamInferenceCostUsd: number | null;
  latencyMs: number;
};`,
"usage snapshot type",
);

replaceOnce(
`function formatCost(value: number | undefined) {
  if (typeof value !== "number") return "—";
  return \`$\${value.toFixed(6)}\`;
}`,
`function formatCost(value: number | null | undefined) {
  if (typeof value !== "number") return "—";
  if (value === 0) return "$0.000000";
  if (value < 0.000001) return \`$\${value.toExponential(2)}\`;
  return \`$\${value.toFixed(6)}\`;
}

function runCost(usage: UsageSnapshot) {
  return usage.actualCostUsd ?? usage.estimatedCostUsd;
}

function summarizeUsage(entries: RunHistoryEntry[]) {
  return entries.reduce(
    (summary, entry) => {
      const usage = entry.run.usageSnapshot;
      if (!usage) return summary;
      summary.runCount += 1;
      summary.promptTokens += usage.promptTokens;
      summary.completionTokens += usage.completionTokens;
      summary.totalTokens += usage.totalTokens;
      summary.costUsd += runCost(usage);
      if (usage.actualCostUsd !== null) summary.actualCostRuns += 1;
      return summary;
    },
    {
      runCount: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      costUsd: 0,
      actualCostRuns: 0,
    },
  );
}`,
"cost helpers",
);

replaceOnce(
`  const currentRuns = runsByPhase[phaseId] ?? [];
  const currentDraft = promptDrafts[phaseId] ?? null;`,
`  const currentRuns = runsByPhase[phaseId] ?? [];
  const currentUsageSummary = summarizeUsage(currentRuns);
  const currentDraft = promptDrafts[phaseId] ?? null;`,
"current usage summary",
);

replaceOnce(
`              {currentIsCharacterType ? (`,
`              {!currentIsCharacterType && currentUsageSummary.runCount > 0 ? (
                <div className={styles.metrics} aria-label="Aşama kullanım özeti">
                  <span>{currentUsageSummary.runCount} ücretli run</span>
                  <span>Input {currentUsageSummary.promptTokens} token</span>
                  <span>Output {currentUsageSummary.completionTokens} token</span>
                  <span>Toplam {currentUsageSummary.totalTokens} token</span>
                  <span>
                    {currentUsageSummary.actualCostRuns ===
                    currentUsageSummary.runCount
                      ? "Gerçek API"
                      : "API / tahmini"}{" "}
                    {formatCost(currentUsageSummary.costUsd)}
                  </span>
                </div>
              ) : null}

              {currentIsCharacterType ? (`,
"phase usage summary",
);

replaceOnce(
`                                {usage ? (
                                  <div className={styles.metrics}>
                                    <span>{usage.totalTokens} token</span>
                                    <span>{usage.latencyMs} ms</span>
                                    <span>
                                      {formatCost(usage.estimatedCostUsd)}
                                    </span>
                                  </div>
                                ) : null}`,
`                                {usage ? (
                                  <div
                                    className={styles.metrics}
                                    aria-label={\`Run \${runNumber} token ve maliyet kullanımı\`}
                                  >
                                    <span>Input {usage.promptTokens} token</span>
                                    <span>
                                      Output {usage.completionTokens} token
                                    </span>
                                    <span>Toplam {usage.totalTokens} token</span>
                                    <span>{usage.latencyMs} ms</span>
                                    <span>
                                      {usage.actualCostUsd !== null
                                        ? "Gerçek API"
                                        : "Tahmini"}{" "}
                                      {formatCost(runCost(usage))}
                                    </span>
                                  </div>
                                ) : null}`,
"run usage metrics",
);

fs.writeFileSync(path, source);
console.log(`Updated ${path}`);
