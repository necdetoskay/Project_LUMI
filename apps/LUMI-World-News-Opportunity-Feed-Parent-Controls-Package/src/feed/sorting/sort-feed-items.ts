import type { WorldFeedItem } from "../types";

const priorityWeight = {
  urgent: 4,
  high: 3,
  normal: 2,
  low: 1,
};

export function sortFeedItems(
  items: WorldFeedItem[],
): WorldFeedItem[] {
  return [...items].sort((a, b) => {
    const priorityDifference =
      priorityWeight[b.priority] -
      priorityWeight[a.priority];

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    if (
      a.status === "unread" &&
      b.status !== "unread"
    ) {
      return -1;
    }

    if (
      b.status === "unread" &&
      a.status !== "unread"
    ) {
      return 1;
    }

    return (
      b.createdAt.getTime() -
      a.createdAt.getTime()
    );
  });
}
