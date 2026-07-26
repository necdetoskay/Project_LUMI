"use client";

import { useMemo, useState } from "react";
import { FeedFilterBar } from "@/components/feed/feed-filter-bar";
import { WorldFeedCard } from "@/components/feed/world-feed-card";
import type { WorldFeedItem } from "@/feed/types";

const demoItems: WorldFeedItem[] = [
  {
    id: "feed-1",
    type: "interaction_opportunity",
    title: "Yaşlı denizciden bir davet",
    summary:
      "Denizci, kıyıda bulunan eski bir pusulanın sırrını birlikte çözmek istiyor.",
    status: "unread",
    priority: "high",
    sourceEntityType:
      "interaction_opportunity",
    sourceEntityId: "opportunity-1",
    createdAt: new Date(),
    expiresAt: new Date(
      Date.now() + 2 * 24 * 60 * 60 * 1000,
    ),
    requiresParentApproval: false,
    childVisible: true,
  },
  {
    id: "feed-2",
    type: "world_news",
    title: "Bulut Köyü'nde festival hazırlığı",
    summary:
      "Köylüler üç gün sonra başlayacak ışık festivaline hazırlanıyor.",
    status: "read",
    priority: "normal",
    sourceEntityType: "world_news",
    sourceEntityId: "news-1",
    createdAt: new Date(
      Date.now() - 60 * 60 * 1000,
    ),
    requiresParentApproval: false,
    childVisible: true,
  },
];

export default function FeedPage() {
  const [filter, setFilter] =
    useState<
      | "all"
      | "unread"
      | "urgent"
      | "opportunities"
      | "news"
    >("all");

  const items = useMemo(() => {
    if (filter === "unread") {
      return demoItems.filter(
        (item) => item.status === "unread",
      );
    }

    if (filter === "urgent") {
      return demoItems.filter((item) =>
        ["urgent", "high"].includes(
          item.priority,
        ),
      );
    }

    if (filter === "opportunities") {
      return demoItems.filter(
        (item) =>
          item.type ===
          "interaction_opportunity",
      );
    }

    if (filter === "news") {
      return demoItems.filter(
        (item) => item.type === "world_news",
      );
    }

    return demoItems;
  }, [filter]);

  return (
    <section className="mx-auto grid max-w-4xl gap-6">
      <div>
        <p className="text-sm font-medium text-primary">
          Yaşayan dünya
        </p>
        <h1 className="mt-2 text-3xl font-semibold">
          Haberler ve fırsatlar
        </h1>
        <p className="mt-3 text-muted-foreground">
          Dünya siz yokken de yaşamaya devam etti.
        </p>
      </div>

      <FeedFilterBar
        value={filter}
        onChange={setFilter}
      />

      <div className="grid gap-4">
        {items.map((item) => (
          <WorldFeedCard
            key={item.id}
            item={item}
          />
        ))}
      </div>
    </section>
  );
}
