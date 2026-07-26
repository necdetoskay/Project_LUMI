import Link from "next/link";
import type { WorldFeedItem } from "@/feed/types";
import { getExpiryLabel } from "@/opportunities/expiry/format-expiry";

export function WorldFeedCard({
  item,
}: {
  item: WorldFeedItem;
}) {
  const expiryLabel = getExpiryLabel(
    item.expiresAt,
  );

  return (
    <article className="rounded-2xl border bg-background p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs">
              {item.type === "world_news"
                ? "Dünya haberi"
                : item.type ===
                    "interaction_opportunity"
                  ? "Fırsat"
                  : "Bildirim"}
            </span>

            {item.priority === "urgent" ||
            item.priority === "high" ? (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
                Önemli
              </span>
            ) : null}

            {item.status === "unread" ? (
              <span className="h-2 w-2 rounded-full bg-primary" />
            ) : null}
          </div>

          <h2 className="mt-3 text-lg font-medium">
            {item.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {item.summary}
          </p>

          {expiryLabel ? (
            <p className="mt-3 text-xs font-medium text-amber-700">
              {expiryLabel}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={
            item.type ===
            "interaction_opportunity"
              ? `/opportunities/${item.sourceEntityId}`
              : `/world-news/${item.sourceEntityId}`
          }
          className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          İncele
        </Link>
      </div>
    </article>
  );
}
