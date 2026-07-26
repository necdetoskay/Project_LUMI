import { desc, eq, gte, lte, and } from "drizzle-orm";
import {
  memories,
  simulationEvents,
  stories,
  worldNews,
} from "../../db/schema";
import type { QueryExecutor } from "../../db/transaction";
import type { DateRange, TimelineItem } from "../types";

export async function getWorldTimeline(
  tx: QueryExecutor,
  input: {
    worldId: string;
    range: DateRange;
    limit: number;
  },
): Promise<TimelineItem[]> {
  const [storyRows, eventRows, memoryRows, newsRows] =
    await Promise.all([
      tx
        .select()
        .from(stories)
        .where(
          and(
            eq(stories.worldId, input.worldId),
            gte(stories.createdAt, input.range.from),
            lte(stories.createdAt, input.range.to),
          ),
        ),
      tx
        .select()
        .from(simulationEvents)
        .where(
          and(
            eq(simulationEvents.worldId, input.worldId),
            gte(
              simulationEvents.occurredAt,
              input.range.from,
            ),
            lte(
              simulationEvents.occurredAt,
              input.range.to,
            ),
          ),
        )
        .orderBy(
          desc(simulationEvents.occurredAt),
        ),
      tx
        .select()
        .from(memories)
        .where(
          and(
            eq(memories.worldId, input.worldId),
            gte(memories.occurredAt, input.range.from),
            lte(memories.occurredAt, input.range.to),
          ),
        ),
      tx
        .select()
        .from(worldNews)
        .where(
          and(
            eq(worldNews.worldId, input.worldId),
            gte(worldNews.createdAt, input.range.from),
            lte(worldNews.createdAt, input.range.to),
          ),
        ),
    ]);

  const items: TimelineItem[] = [
    ...storyRows.map((story) => ({
      id: `story:${story.id}`,
      occurredAt: story.createdAt,
      itemType: "story" as const,
      title: story.title,
      summary: "Yeni bir hikâye oluşturuldu.",
      entityType: "story",
      entityId: story.id,
    })),
    ...eventRows.map((event) => ({
      id: `event:${event.id}`,
      occurredAt: event.occurredAt,
      itemType: "simulation" as const,
      title: event.eventType,
      summary: event.summary,
      entityType: "simulation_event",
      entityId: event.id,
      metadata: event.payload,
    })),
    ...memoryRows.map((memory) => ({
      id: `memory:${memory.id}`,
      occurredAt: memory.occurredAt,
      itemType: "memory" as const,
      title: memory.memoryType,
      summary: memory.summary,
      entityType: "memory",
      entityId: memory.id,
    })),
    ...newsRows.map((news) => ({
      id: `news:${news.id}`,
      occurredAt: news.createdAt,
      itemType: "world_news" as const,
      title: news.title,
      summary: news.summary,
      entityType: "world_news",
      entityId: news.id,
    })),
  ];

  return items
    .sort(
      (a, b) =>
        b.occurredAt.getTime() -
        a.occurredAt.getTime(),
    )
    .slice(0, input.limit);
}
