export type DateRange = {
  from: Date;
  to: Date;
};

export type DashboardSummary = {
  childProfileId: string;
  storiesCompleted: number;
  activeStories: number;
  opportunitiesReceived: number;
  opportunitiesAccepted: number;
  unreadFeedItems: number;
  simulationRuns: number;
  memoriesCreated: number;
  totalCostTry: number;
  blockedSafetyReviews: number;
};

export type TimelineItem = {
  id: string;
  occurredAt: Date;
  itemType:
    | "story"
    | "decision"
    | "opportunity"
    | "world_news"
    | "simulation"
    | "memory"
    | "safety"
    | "cost";
  title: string;
  summary: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
};

export type OpportunityMetrics = {
  received: number;
  viewed: number;
  accepted: number;
  declined: number;
  snoozed: number;
  expired: number;
  storyStarted: number;
  acceptanceRate: number;
  storyConversionRate: number;
};

export type CostMetrics = {
  estimatedTry: number;
  actualTry: number;
  varianceTry: number;
  textGenerationTry: number;
  imageGenerationTry: number;
  audioGenerationTry: number;
};
