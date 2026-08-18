import { notFound } from "next/navigation";

import type { CanonicalTestLabDashboardData } from "@/lib/ai/test-lab-dashboard-view-model";

import tuningStyles from "../canonical-dashboard-tuning.module.css";
import CanonicalTestLabDashboard from "../canonical-dashboard";

export const dynamic = "force-dynamic";

const recentRuns = [
  {
    name: "Dünya Önerisi · 18 Ağu 2026 22:35",
    model: "openrouter/anthropic/claude-sonnet-4.5",
    score: "82 / 100",
    scoreState: "İyi" as const,
    scoreValue: 82,
    cost: "$0.02",
    duration: "13.1 sn",
    status: "Completed" as const,
    createdAtLabel: "18 Ağu 2026 22:35",
    scenarioLabel: "Onboarding",
    phaseLabel: "Dünya Önerisi",
  },
  {
    name: "Karakter Kimliği · 18 Ağu 2026 22:31",
    model: "deepseek/deepseek-chat-v3.1",
    score: "78 / 100",
    scoreState: "Orta" as const,
    scoreValue: 78,
    cost: "$0.0042",
    duration: "8.4 sn",
    status: "Completed" as const,
    createdAtLabel: "18 Ağu 2026 22:31",
    scenarioLabel: "Onboarding",
    phaseLabel: "Karakter Kimliği",
  },
  {
    name: "Hikaye 3 · 18 Ağu 2026 22:22",
    model: "openrouter/meta-llama/llama-3.1-70b-instruct",
    score: "73 / 100",
    scoreState: "Orta" as const,
    scoreValue: 73,
    cost: "$0.01",
    duration: "1 dk 1 sn",
    status: "Completed" as const,
    createdAtLabel: "18 Ağu 2026 22:22",
    scenarioLabel: "Hikaye",
    phaseLabel: "Hikaye 3",
  },
  {
    name: "Uyumluluk · 18 Ağu 2026 22:18",
    model: "openai/gpt-4.1",
    score: "61 / 100",
    scoreState: "Zayıf" as const,
    scoreValue: 61,
    cost: "$0.03",
    duration: "6.8 sn",
    status: "Failed" as const,
    createdAtLabel: "18 Ağu 2026 22:18",
    scenarioLabel: "Onboarding",
    phaseLabel: "Uyumluluk",
  },
  {
    name: "Bölge Önerisi · 18 Ağu 2026 22:12",
    model: "google/gemini-2.5-flash",
    score: "86 / 100",
    scoreState: "İyi" as const,
    scoreValue: 86,
    cost: "$0.0031",
    duration: "5.2 sn",
    status: "Completed" as const,
    createdAtLabel: "18 Ağu 2026 22:12",
    scenarioLabel: "Onboarding",
    phaseLabel: "Bölge Önerisi",
  },
];

const fixture: CanonicalTestLabDashboardData = {
  latestRun: recentRuns[0] ?? null,
  recentRuns,
  evaluation: {
    ready: true,
    overallScore: 82,
    scoreState: "İyi",
    judgeModel: "openrouter/anthropic/claude-sonnet-4.5-judge",
    rubricLabel: "Story Quality v1 · blind judge",
    evaluatedCandidates: 4,
    totalCandidates: 5,
    progressPercent: 80,
    qualityMetrics: [
      { key: "continuity", label: "Bütünlük", score: 86, pending: false },
      {
        key: "emotional_resonance",
        label: "Duygusal Etki",
        score: 80,
        pending: false,
      },
      { key: "creativity", label: "Yaratıcılık", score: 78, pending: false },
      { key: "curiosity", label: "Merak", score: 85, pending: false },
      {
        key: "character_fidelity",
        label: "Karakter Tutarlılığı",
        score: 82,
        pending: false,
      },
      {
        key: "age_suitability",
        label: "Yaşa Uygunluk",
        score: 95,
        pending: false,
      },
    ],
    trend: [
      { score: 64, label: "22:05" },
      { score: 69, label: "22:11" },
      { score: 73, label: "22:17" },
      { score: 78, label: "22:23" },
      { score: 80, label: "22:29" },
      { score: 82, label: "22:35" },
    ],
    successfulRuns: 4,
    evaluatedRuns: 5,
  },
};

export default function TestLabUi3VisualPage() {
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
