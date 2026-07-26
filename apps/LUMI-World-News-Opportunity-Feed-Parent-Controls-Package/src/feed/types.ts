export type FeedItemType =
  | "world_news"
  | "interaction_opportunity"
  | "story_hook"
  | "system_notice";

export type FeedItemStatus =
  | "unread"
  | "read"
  | "accepted"
  | "declined"
  | "snoozed"
  | "expired";

export type FeedPriority =
  | "low"
  | "normal"
  | "high"
  | "urgent";

export type WorldFeedItem = {
  id: string;
  type: FeedItemType;
  title: string;
  summary: string;
  status: FeedItemStatus;
  priority: FeedPriority;
  sourceEntityType: string;
  sourceEntityId: string;
  createdAt: Date;
  expiresAt?: Date;
  requiresParentApproval: boolean;
  childVisible: boolean;
  metadata?: Record<string, unknown>;
};
