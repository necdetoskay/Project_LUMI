import { formatDateTime } from "@/analytics/formatters";
import type { TimelineItem } from "@/analytics/types";

export function WorldTimeline({
  items,
}: {
  items: TimelineItem[];
}) {
  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <article
          key={item.id}
          className="relative rounded-2xl border bg-background p-5"
        >
          <p className="text-xs text-muted-foreground">
            {formatDateTime(item.occurredAt)}
          </p>
          <h3 className="mt-2 font-medium">
            {item.title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {item.summary}
          </p>
        </article>
      ))}
    </div>
  );
}
