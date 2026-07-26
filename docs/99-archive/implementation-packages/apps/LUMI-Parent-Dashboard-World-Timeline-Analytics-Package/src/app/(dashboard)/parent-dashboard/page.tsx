"use client";

import { useMemo, useState } from "react";
import { DateRangeFilter } from "@/components/dashboard/date-range-filter";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ParentActionCenter } from "@/components/dashboard/parent-action-center";
import { WorldTimeline } from "@/components/dashboard/world-timeline";
import { formatPercent, formatTry } from "@/analytics/formatters";

const timeline = [
  {
    id: "1",
    occurredAt: new Date(),
    itemType: "world_news" as const,
    title: "Bulut Köyü festival hazırlığına başladı",
    summary:
      "Yerleşimde üç gün sürecek ışık festivali için hazırlıklar başladı.",
    entityType: "world_news",
    entityId: "news-1",
  },
  {
    id: "2",
    occurredAt: new Date(
      Date.now() - 60 * 60 * 1000,
    ),
    itemType: "story" as const,
    title: "Kayıp Pusulanın Sırrı",
    summary:
      "Yeni hikâye tamamlandı ve iki karar kaydedildi.",
    entityType: "story",
    entityId: "story-1",
  },
];

export default function ParentDashboardPage() {
  const [range, setRange] =
    useState<"7d" | "30d" | "90d">("30d");

  const metrics = useMemo(
    () => ({
      stories: range === "7d" ? 2 : 8,
      opportunities: range === "7d" ? 3 : 11,
      acceptanceRate: 0.64,
      cost: range === "7d" ? 18.5 : 72.4,
      memories: range === "7d" ? 12 : 47,
      safetyBlocks: 0,
    }),
    [range],
  );

  return (
    <section className="mx-auto grid max-w-6xl gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">
            Ebeveyn özeti
          </p>
          <h1 className="mt-2 text-3xl font-semibold">
            LUMI kontrol paneli
          </h1>
          <p className="mt-3 text-muted-foreground">
            Hikâyeler, dünya gelişmeleri ve kullanım özeti.
          </p>
        </div>

        <DateRangeFilter
          value={range}
          onChange={setRange}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Tamamlanan hikâye"
          value={String(metrics.stories)}
        />
        <MetricCard
          label="Gelen fırsat"
          value={String(metrics.opportunities)}
        />
        <MetricCard
          label="Fırsat kabul oranı"
          value={formatPercent(
            metrics.acceptanceRate,
          )}
        />
        <MetricCard
          label="Toplam AI maliyeti"
          value={formatTry(metrics.cost)}
        />
        <MetricCard
          label="Yeni hafıza"
          value={String(metrics.memories)}
        />
        <MetricCard
          label="Engellenen içerik"
          value={String(
            metrics.safetyBlocks,
          )}
          helper="Safety review tarafından engellendi"
        />
      </div>

      <ParentActionCenter
        actions={[
          {
            id: "action-1",
            title: "Bir fırsat ebeveyn onayı bekliyor",
            description:
              "Yaşlı denizcinin davetini inceleyin.",
            href: "/feed",
            urgency: "high",
          },
        ]}
      />

      <section>
        <h2 className="text-2xl font-semibold">
          Dünya zaman çizelgesi
        </h2>
        <div className="mt-5">
          <WorldTimeline items={timeline} />
        </div>
      </section>
    </section>
  );
}
