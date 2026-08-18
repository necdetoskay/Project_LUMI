import { readFileSync, writeFileSync } from "node:fs";

const path = "apps/web/app/app/settings/test-lab/canonical-dashboard.tsx";
let text = readFileSync(path, "utf8");

function replaceOnce(from, to, label) {
  if (!text.includes(from)) throw new Error(`UI3_PATCH_MISSING:${label}`);
  text = text.replace(from, to);
}

replaceOnce(
  `  CanonicalTestLabDashboardData,\n  CanonicalTestLabRunView,`,
  `  CanonicalTestLabDashboardData,\n  CanonicalTestLabEvaluationView,\n  CanonicalTestLabQualityMetric,\n  CanonicalTestLabRunView,`,
  "imports",
);

const qualityStart = text.indexOf("const qualityMetrics = [");
const qualityEnd = text.indexOf("] as const;", qualityStart);
if (qualityStart === -1 || qualityEnd === -1) throw new Error("UI3_PATCH_MISSING:quality-const");
text = text.slice(0, qualityStart) + text.slice(qualityEnd + "] as const;".length + 1);

replaceOnce(
  `function LiveRunPanel({\n  latestRun,\n}: {\n  latestRun: CanonicalTestLabRunView | null;\n}) {\n  const hasRun = latestRun !== null;\n  const steps = [\n    ["Örnek üret", hasRun ? "100%" : "Queued", hasRun ? "done" : "queued"],\n    ["Yargılayıcı model\\ndeğerlendir", "UI-3", "queued"],\n    ["Rubrik puanla", "UI-3", "queued"],\n    ["Promptu iyileştir", "UI-4", "queued"],\n    ["Final raporu oluştur", "Queued", "queued"],\n  ] as const;`,
  `function LiveRunPanel({\n  latestRun,\n  evaluation,\n}: {\n  latestRun: CanonicalTestLabRunView | null;\n  evaluation: CanonicalTestLabEvaluationView;\n}) {\n  const hasRun = latestRun !== null;\n  const evaluationReady = evaluation.ready;\n  const steps = [\n    ["Örnek üret", hasRun ? "100%" : "Queued", hasRun ? "done" : "queued"],\n    [\n      "Yargılayıcı model\\ndeğerlendir",\n      evaluationReady ? \`${"${evaluation.progressPercent}"}%\` : "Queued",\n      evaluationReady ? "done" : "queued",\n    ],\n    ["Rubrik puanla", evaluationReady ? "100%" : "Queued", evaluationReady ? "done" : "queued"],\n    ["Promptu iyileştir", "UI-4", "queued"],\n    ["Final raporu oluştur", "Queued", "queued"],\n  ] as const;\n  const trendGeometry = evaluation.trend.map((point, index, items) => {\n    const x = 42 + (items.length <= 1 ? 0 : (474 * index) / (items.length - 1));\n    const y = 102 - point.score * 0.86;\n    return { x, y, ...point };\n  });\n  const trendPoints = trendGeometry.map((point) => \`${"${point.x}"},${"${point.y}"}\`).join(" ");\n  const trendArea =\n    trendGeometry.length === 0\n      ? ""\n      : \`M${"${trendGeometry[0]?.x ?? 42}"} 102 L ${"${trendPoints}"} L ${"${trendGeometry.at(-1)?.x ?? 42}"} 102 Z\`;`,
  "live-signature",
);

replaceOnce(
  `              ●&nbsp; {latestRun?.status ?? "Idle"}`,
  `              ●&nbsp; {evaluationReady ? "Evaluated" : (latestRun?.status ?? "Idle")}`,
  "badge",
);

replaceOnce(
  `            <span>Koşu Kaydı</span>\n            <b>{hasRun ? 1 : 0}</b>`,
  `            <span>Judge İlerlemesi</span>\n            <b>{evaluation.totalCandidates}</b>`,
  "progress-label",
);
replaceOnce(
  `            <span style={{ width: hasRun ? "100%" : "0%" }} />`,
  `            <span style={{ width: \`${"${evaluation.progressPercent}"}%\` }} />`,
  "progress-track",
);
replaceOnce(
  `              <b>{hasRun ? 1 : 0}</b> / {hasRun ? 1 : 0} tamamlandı\n            </span>\n            <b>{hasRun ? "%100" : "%0"}</b>`,
  `              <b>{evaluation.evaluatedCandidates}</b> / {evaluation.totalCandidates} değerlendirildi\n            </span>\n            <b>%{evaluation.progressPercent}</b>`,
  "progress-bottom",
);
replaceOnce(
  `{hasRun ? "Run kaydı tamamlandı" : "Koşu bekleniyor"}`,
  `{evaluationReady ? "Judge değerlendirmesi tamamlandı" : "Judge bekleniyor"}`,
  "current-step",
);
replaceOnce(
  `<p>{latestRun?.model ?? "Model seçimi bekleniyor"}</p>\n          <span>\n            {latestRun\n              ? \`${"${latestRun.scenarioLabel}"} • ${"${latestRun.phaseLabel}"}\`\n              : "Advanced yüzeyinden yeni koşu başlatılabilir."}\n          </span>\n          <Icon name={hasRun ? "check_circle" : "schedule"} />`,
  `<p>{evaluation.judgeModel ?? "Judge modeli bekleniyor"}</p>\n          <span>\n            {evaluation.rubricLabel\n              ? evaluation.rubricLabel\n              : "Advanced yüzeyinden judge değerlendirmesi başlatılabilir."}\n          </span>\n          <Icon name={evaluationReady ? "check_circle" : "schedule"} />`,
  "judge-box",
);
replaceOnce(
  `<strong>Canlı Skor Trendi · UI-3</strong>`,
  `<strong>Canlı Skor Trendi</strong>`,
  "chart-title",
);
replaceOnce(
  `            </g>\n          </svg>`,
  `            </g>\n            {trendGeometry.length > 0 ? (\n              <>\n                <path d={trendArea} fill="url(#scoreArea)" />\n                <polyline className={styles.chartLine} points={trendPoints} />\n                {trendGeometry.map((point) => (\n                  <circle key={\`${"${point.label}"}:${"${point.score}"}\`} cx={point.x} cy={point.y} r="2.4" />\n                ))}\n              </>\n            ) : null}\n          </svg>`,
  "chart-svg",
);
replaceOnce(
  `          <div className={styles.chartAxis}>\n            <span>—</span>\n            <span>—</span>\n            <span>—</span>\n            <span>—</span>\n            <span>—</span>\n            <span>UI-3</span>\n          </div>`,
  `          <div className={styles.chartAxis}>\n            {Array.from({ length: 6 }, (_, index) => (\n              <span key={index}>{evaluation.trend[index]?.label ?? "—"}</span>\n            ))}\n          </div>`,
  "chart-axis",
);
replaceOnce(
  `            <strong>—</strong>\n            <small>/100</small>\n          </div>\n          <b>●&nbsp; UI-3</b>`,
  `            <strong>{evaluation.overallScore ?? "—"}</strong>\n            <small>/100</small>\n          </div>\n          <b>●&nbsp; {evaluation.scoreState}</b>`,
  "current-score",
);

replaceOnce(
  `function QualityPanel() {`,
  `function QualityPanel({ metrics }: { metrics: CanonicalTestLabQualityMetric[] }) {`,
  "quality-signature",
);
replaceOnce(`{qualityMetrics.map((metric) => (`, `{metrics.map((metric) => (`, "quality-map");

replaceOnce(
  `<span className={styles.scoreMedium}>● {run.scoreState}</span>`,
  `<span\n                    className={\n                      run.scoreState === "İyi"\n                        ? styles.scoreGood\n                        : run.scoreState === "Zayıf"\n                          ? styles.scoreBad\n                          : styles.scoreMedium\n                    }\n                  >\n                    ● {run.scoreState}\n                  </span>`,
  "recent-score-state",
);

replaceOnce(
  `<span className={styles.goodDot}>● UI-3</span>\n                <span>{latestRun?.createdAtLabel ?? "Değerlendirme yok"}</span>`,
  `<span className={styles.goodDot}>● {data.evaluation.scoreState}</span>\n                <span>{latestRun?.createdAtLabel ?? "Değerlendirme yok"}</span>`,
  "kpi-score-footnote",
);
replaceOnce(
  `<strong className={styles.kpiScoreGood}>—</strong>\n            <span>/ 100</span>`,
  `<strong className={styles.kpiScoreGood}>\n              {data.evaluation.overallScore ?? "—"}\n            </strong>\n            <span>/ 100</span>`,
  "kpi-score",
);
replaceOnce(
  `footnote={<>Değerlendirme UI-3 kapsamında</>}`,
  `footnote={<>Judge değerlendirmesi tamamlanan koşular</>}`,
  "success-footnote",
);
replaceOnce(
  `<strong className={styles.kpiScoreBlue}>—</strong>\n            <span>/ —</span>`,
  `<strong className={styles.kpiScoreBlue}>\n              {data.evaluation.successfulRuns}\n            </strong>\n            <span>/ {data.evaluation.evaluatedRuns}</span>`,
  "success-kpi",
);
replaceOnce(
  `<LiveRunPanel latestRun={latestRun} />`,
  `<LiveRunPanel latestRun={latestRun} evaluation={data.evaluation} />`,
  "live-call",
);
replaceOnce(
  `<QualityPanel />`,
  `<QualityPanel metrics={data.evaluation.qualityMetrics} />`,
  "quality-call",
);

writeFileSync(path, text);
