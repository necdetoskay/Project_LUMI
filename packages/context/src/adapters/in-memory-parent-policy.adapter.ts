import {
  type ContextRequest,
  type ContextSourceResult,
  type ParentPolicyItem,
  type ParentPolicySource,
} from "../ports";

export class InMemoryParentPolicyAdapter implements ParentPolicySource {
  constructor(private readonly policy: ParentPolicyItem) {}

  async fetch(
    _request: ContextRequest,
  ): Promise<ContextSourceResult<ParentPolicyItem>> {
    void _request;
    return {
      sourceRelevance: 1,
      items: [
        {
          id: `parent-policy:${this.policy.householdId}`,
          type: "parent-policy",
          content: this.policy,
          text: [
            `contentBoundary: ${this.policy.contentBoundary}`,
            `maxDailyStories: ${this.policy.maxDailyStories}`,
            `requireParentApprovalForAi: ${this.policy.requireParentApprovalForAi}`,
            `allowImageGeneration: ${this.policy.allowImageGeneration}`,
            `allowTts: ${this.policy.allowTts}`,
            `forbiddenThemes: ${this.policy.forbiddenThemes.join(", ")}`,
          ].join("\n"),
          sourceEngine: "parent-policy",
          authority: 0.95,
          confidence: 1,
          scope: "narrative_instruction",
          priority: 1,
          relevance: 1,
        },
      ],
    };
  }
}
