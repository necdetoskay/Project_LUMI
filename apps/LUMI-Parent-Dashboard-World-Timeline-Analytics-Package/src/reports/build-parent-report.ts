import type {
  CostMetrics,
  DashboardSummary,
  OpportunityMetrics,
  TimelineItem,
} from "../analytics/types";

export type ParentReport = {
  generatedAt: string;
  title: string;
  summary: DashboardSummary;
  opportunityMetrics: OpportunityMetrics;
  costMetrics: CostMetrics;
  timeline: TimelineItem[];
};

export function buildParentReport(input: {
  childName: string;
  summary: DashboardSummary;
  opportunityMetrics: OpportunityMetrics;
  costMetrics: CostMetrics;
  timeline: TimelineItem[];
  now?: Date;
}): ParentReport {
  return {
    generatedAt:
      (input.now ?? new Date()).toISOString(),
    title: `${input.childName} için LUMI aktivite raporu`,
    summary: input.summary,
    opportunityMetrics:
      input.opportunityMetrics,
    costMetrics: input.costMetrics,
    timeline: input.timeline,
  };
}
