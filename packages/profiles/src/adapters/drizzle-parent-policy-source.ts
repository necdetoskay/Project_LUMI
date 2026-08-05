import type {
  ContextItem,
  ContextRequest,
  ContextSourceResult,
  ParentPolicyItem,
  ParentPolicySource,
} from "@lumi/context";

import type { ParentPolicyRepository } from "../db/repositories/interfaces/parent-policy.repository";
import type { ParentalSettingRecord } from "../db/schema/profile/parental-settings";

export type ContentBoundary = ParentPolicyItem["contentBoundary"];

const CONTENT_BOUNDARIES: ReadonlySet<string> = new Set([
  "strict",
  "moderate",
  "open",
]);

function toContentBoundary(value: string): ContentBoundary {
  return CONTENT_BOUNDARIES.has(value) ? (value as ContentBoundary) : "strict";
}

export interface DrizzleParentPolicySourceDeps {
  repository: ParentPolicyRepository;
  actorUserId: string;
}

/**
 * Production adapter bridging the persisted parent policy (`parental_settings`
 * via `ParentPolicyRepository`) to the `@lumi/context` `ParentPolicySource`
 * port. It maps the stored record into a `ParentPolicyItem`, surfacing
 * `safetyMetadata.blockedTopics` as `forbiddenThemes`.
 */
export class DrizzleParentPolicySource implements ParentPolicySource {
  private readonly repository: ParentPolicyRepository;
  private readonly actorUserId: string;

  constructor(deps: DrizzleParentPolicySourceDeps) {
    this.repository = deps.repository;
    this.actorUserId = deps.actorUserId;
  }

  async fetch(
    request: ContextRequest,
  ): Promise<ContextSourceResult<ParentPolicyItem>> {
    const record = await this.repository.findByHousehold(
      request.householdId,
      this.actorUserId,
    );

    if (record === null) {
      return { sourceRelevance: 0, items: [] };
    }

    return {
      sourceRelevance: 1,
      items: [toParentPolicyItem(record)],
    };
  }
}

function toParentPolicyItem(
  record: ParentalSettingRecord,
): ContextItem<ParentPolicyItem> {
  const policy: ParentPolicyItem = {
    householdId: record.householdId,
    maxDailyStories: record.maxDailyStories,
    contentBoundary: toContentBoundary(record.contentBoundary),
    requireParentApprovalForAi: record.requireParentApprovalForAi,
    allowImageGeneration: record.allowImageGeneration,
    allowTts: record.allowTts,
    timeLimitMinutes: record.timeLimitMinutes,
    forbiddenThemes: record.safetyMetadata?.blockedTopics ?? [],
  };

  return {
    id: `parent-policy:${record.householdId}`,
    type: "parent-policy",
    content: policy,
    text: [
      `contentBoundary: ${policy.contentBoundary}`,
      `maxDailyStories: ${policy.maxDailyStories}`,
      `requireParentApprovalForAi: ${policy.requireParentApprovalForAi}`,
      `allowImageGeneration: ${policy.allowImageGeneration}`,
      `allowTts: ${policy.allowTts}`,
      `forbiddenThemes: ${policy.forbiddenThemes.join(", ")}`,
    ].join("\n"),
    sourceEngine: "parent-policy",
    authority: 0.95,
    confidence: 1,
    scope: "narrative_instruction",
    priority: 1,
    relevance: 1,
  };
}
