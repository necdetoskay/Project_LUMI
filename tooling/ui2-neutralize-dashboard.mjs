import { readFileSync, writeFileSync } from "node:fs";

const path = "apps/web/app/app/settings/test-lab/canonical-dashboard.tsx";
let text = readFileSync(path, "utf8");

function replaceOnce(from, to, label) {
  if (!text.includes(from)) {
    throw new Error(`UI2_PATCH_MISSING:${label}`);
  }
  text = text.replace(from, to);
}

replaceOnce(
  `const qualityMetrics = [
  { label: "Bütünlük", score: 86, tone: "green" },
  { label: "Duygusal Etki", score: 80, tone: "green" },
  { label: "Yaratıcılık", score: 78, tone: "amber" },
  { label: "Merak", score: 85, tone: "green" },
  { label: "Karakter Tutarlılığı", score: 82, tone: "green" },
  { label: "Güvenlik", score: 95, tone: "green" },
] as const;`,
  `const qualityMetrics = [
  { label: "Bütünlük", score: 0, pending: true },
  { label: "Duygusal Etki", score: 0, pending: true },
  { label: "Yaratıcılık", score: 0, pending: true },
  { label: "Merak", score: 0, pending: true },
  { label: "Karakter Tutarlılığı", score: 0, pending: true },
  { label: "Güvenlik", score: 0, pending: true },
] as const;`,
  "quality-metrics",
);

replaceOnce(
  `              <b>
                {metric.score} <small>/100</small>
              </b>`,
  `              <b>
                {metric.pending ? "—" : metric.score} <small>/100</small>
              </b>`,
  "quality-score",
);

replaceOnce(
  `              <span
                className={metric.tone === "amber" ? styles.qualityAmber : ""}
                style={{ width: \`${"${metric.score}"}%\` }}
              />`,
  `              <span style={{ width: \`${"${metric.score}"}%\` }} />`,
  "quality-bar",
);

replaceOnce(
  `          <div className={styles.chartAxis}>
            <span>14:35</span>
            <span>14:38</span>
            <span>14:41</span>
            <span>14:44</span>
            <span>14:47</span>
            <span>14:50 (tahmini)</span>
          </div>`,
  `          <div className={styles.chartAxis}>
            <span>—</span>
            <span>—</span>
            <span>—</span>
            <span>—</span>
            <span>—</span>
            <span>UI-3</span>
          </div>`,
  "chart-axis",
);

const fakeTrendStart = text.indexOf("            <path\n              d=\"M42 83");
const fakeTrendEndMarker = "            })}\n";
if (fakeTrendStart === -1) {
  throw new Error("UI2_PATCH_MISSING:fake-trend-start");
}
const fakeTrendEnd = text.indexOf(fakeTrendEndMarker, fakeTrendStart);
if (fakeTrendEnd === -1) {
  throw new Error("UI2_PATCH_MISSING:fake-trend-end");
}
text =
  text.slice(0, fakeTrendStart) +
  text.slice(fakeTrendEnd + fakeTrendEndMarker.length);

replaceOnce(
  `      <span className={styles.aiBadge}>AI Önerisi</span>
      <p>
        Hikayelerde merak unsurunu artırmak için sorularla biten kısa bölümler
        ekleyin. Karakter motivasyonlarını daha belirgin göstermek için iç
        monolog veya kısa diyaloglarla derinlik katın.
      </p>`,
  `      <span className={styles.aiBadge}>UI-4</span>
      <p>
        Prompt iyileştirme önerileri, değerlendirme sonuçları UI-3 ile
        bağlandıktan sonra immutable draft akışı üzerinden burada gösterilecek.
      </p>`,
  "prompt-copy",
);

replaceOnce(
  `<button className={styles.promptDetails} type="button">`,
  `<button className={styles.promptDetails} type="button" disabled>`,
  "prompt-details-disabled",
);
replaceOnce(
  `<button className={styles.applyPromptButton} type="button">`,
  `<button className={styles.applyPromptButton} type="button" disabled>`,
  "prompt-apply-disabled",
);

writeFileSync(path, text);
