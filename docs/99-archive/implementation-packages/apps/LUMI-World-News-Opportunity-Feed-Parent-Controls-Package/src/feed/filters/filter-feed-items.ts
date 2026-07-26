import type {
  FeedItemStatus,
  FeedItemType,
  FeedPriority,
  WorldFeedItem,
} from "../types";

export type FeedFilters = {
  types?: FeedItemType[];
  statuses?: FeedItemStatus[];
  priorities?: FeedPriority[];
  onlyChildVisible?: boolean;
  includeExpired?: boolean;
};

export function filterFeedItems(
  items: WorldFeedItem[],
  filters: FeedFilters,
  now = new Date(),
): WorldFeedItem[] {
  return items.filter((item) => {
    if (
      filters.types?.length &&
      !filters.types.includes(item.type)
    ) {
      return false;
    }

    if (
      filters.statuses?.length &&
      !filters.statuses.includes(item.status)
    ) {
      return false;
    }

    if (
      filters.priorities?.length &&
      !filters.priorities.includes(item.priority)
    ) {
      return false;
    }

    if (
      filters.onlyChildVisible &&
      !item.childVisible
    ) {
      return false;
    }

    if (
      !filters.includeExpired &&
      item.expiresAt &&
      item.expiresAt < now
    ) {
      return false;
    }

    return true;
  });
}
