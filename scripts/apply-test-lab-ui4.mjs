import fs from "node:fs";

const dashboardPath =
  "apps/web/app/app/settings/test-lab/canonical-dashboard.tsx";
const cssPath =
  "apps/web/app/app/settings/test-lab/canonical-dashboard.module.css";

let dashboard = fs.readFileSync(dashboardPath, "utf8");

if (!dashboard.includes('from "./prompt-improvement-card"')) {
  dashboard = dashboard.replace(
    'import styles from "./canonical-dashboard.module.css";',
    'import { PromptImprovementCard } from "./prompt-improvement-card";\n\nimport styles from "./canonical-dashboard.module.css";',
  );
}

dashboard = dashboard.replace(
  /function PromptSuggestion\(\) \{[\s\S]*?\n\}\n\nfunction RecentRuns/,
  "function RecentRuns",
);
dashboard = dashboard.replace(
  /<PromptSuggestion \/>/g,
  "<PromptImprovementCard />",
);
dashboard = dashboard.replace(
  '["Promptu iyileştir", "UI-4", "queued"],',
  '[\n      "Promptu iyileştir",\n      evaluationReady ? "Ready" : "Queued",\n      evaluationReady ? "done" : "queued",\n    ],',
);

if (!dashboard.includes("<PromptImprovementCard />")) {
  throw new Error("UI4_BIND_FAILED:PROMPT_CARD_NOT_BOUND");
}
fs.writeFileSync(dashboardPath, dashboard);

let css = fs.readFileSync(cssPath, "utf8");
const marker = "/* test-lab-ui4-prompt-improvement */";
if (!css.includes(marker)) {
  css += `\n\n${marker}\n.promptDetails {\n  height: auto;\n  display: block;\n  padding: 0;\n  overflow: hidden;\n}\n\n.promptDetails summary {\n  display: flex;\n  min-height: 28px;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0 9px;\n  cursor: pointer;\n  list-style: none;\n}\n\n.promptDetails summary::-webkit-details-marker {\n  display: none;\n}\n\n.promptDetailBody {\n  display: grid;\n  gap: 4px;\n  border-top: 1px solid #e5e5ec;\n  padding: 7px 9px 8px;\n  color: #555460;\n  font-size: 8.5px;\n  line-height: 1.35;\n}\n\n.promptDetailBody strong {\n  color: #2d2b35;\n  font-size: 9px;\n}\n\n.promptDetailBody small {\n  color: #787681;\n  font-size: 7.8px;\n}\n\n.applyPromptButton:disabled {\n  cursor: default;\n  opacity: 0.72;\n}\n\n.promptApplyMessage,\n.promptApplyError {\n  margin: 6px 0 0 !important;\n  font-size: 8.4px !important;\n  line-height: 1.35 !important;\n}\n\n.promptApplyMessage {\n  color: #24734a !important;\n}\n\n.promptApplyMessage a {\n  color: #6428dd;\n  font-weight: 750;\n}\n\n.promptApplyError {\n  color: #b64035 !important;\n}\n`;
}
fs.writeFileSync(cssPath, css);
