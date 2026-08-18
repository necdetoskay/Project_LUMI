import { notFound } from "next/navigation";

import type { CanonicalTestLabDashboardData } from "@/lib/ai/test-lab-dashboard-view-model";

import tuningStyles from "../canonical-dashboard-tuning.module.css";
import CanonicalTestLabDashboard from "../canonical-dashboard";

export const dynamic = "force-dynamic";

const fixture: CanonicalTestLabDashboardData = {
  latestRun: {
    name: "Dünya Önerisi · 18 Ağu 2026 21:35",
    model: "openrouter/anthropic/claude-sonnet-4.5",
    score: "— / 100",
    scoreState: "UI-3",
    cost: "$0.02",
    duration: "13.1 sn",
    status: "Completed",
    createdAtLabel: "18 Ağu 2026 21:35",
    scenarioLabel: "Karakter Onboarding",
    phaseLabel: "Dünya Önerisi",
  },
  recentRuns: [
    {
      name: "Dünya Önerisi · 18 Ağu 2026 21:35",
      model: "openrouter/anthropic/claude-sonnet-4.5",
      score: "— / 100",
      scoreState: "UI-3",
      cost: "$0.02",
      duration: "13.1 sn",
      status: "Completed",
      createdAtLabel: "18 Ağu 2026 21:35",
      scenarioLabel: "Karakter Onboarding",
      phaseLabel: "Dünya Önerisi",
    },
    {
      name: "Karakter Kimliği · 18 Ağu 2026 21:31",
      model: "deepseek/deepseek-chat-v3.1",
      score: "— / 100",
      scoreState: "UI-3",
      cost: "$0.0042",
      duration: "8.4 sn",
      status: "Completed",
      createdAtLabel: "18 Ağu 2026 21:31",
      scenarioLabel: "Karakter Onboarding",
      phaseLabel: "Karakter Kimliği",
    },
    {
      name: "Hikaye 3 · 18 Ağu 2026 21:22",
      model: "openrouter/meta-llama/llama-3.1-70b-instruct",
      score: "— / 100",
      scoreState: "UI-3",
      cost: "$0.01",
      duration: "1 dk 1 sn",
      status: "Completed",
      createdAtLabel: "18 Ağu 2026 21:22",
      scenarioLabel: "Hikaye Üretimi",
      phaseLabel: "Hikaye 3",
    },
    {
      name: "Uyumluluk · 18 Ağu 2026 21:18",
      model: "openai/gpt-4.1",
      score: "— / 100",
      scoreState: "UI-3",
      cost: "$0.03",
      duration: "6.8 sn",
      status: "Failed",
      createdAtLabel: "18 Ağu 2026 21:18",
      scenarioLabel: "Karakter Onboarding",
      phaseLabel: "Uyumluluk",
    },
    {
      name: "Bölge Önerisi · 18 Ağu 2026 21:12",
      model: "google/gemini-2.5-flash",
      score: "— / 100",
      scoreState: "UI-3",
      cost: "$0.0031",
      duration: "5.2 sn",
      status: "Completed",
      createdAtLabel: "18 Ağu 2026 21:12",
      scenarioLabel: "Karakter Onboarding",
      phaseLabel: "Bölge Önerisi",
    },
  ],
};

export default function TestLabUi2VisualPage() {
  const enabled =
    process.env.LUMI_VISUAL_TEST === "1" ||
    process.env.NEXT_DIST_DIR === ".next-e2e";
  if (!enabled) notFound();

  return (
    <div className={tuningStyles.tuned}>
      <CanonicalTestLabDashboard data={fixture} />
    </div>
  );
}
