import type {
  ContextRequest,
  ContextSourceResult,
  KnowledgeItem,
  KnowledgeSource,
  ParentPolicyItem,
  ParentPolicySource,
  SafetyPolicyItem,
  SafetyPolicySource,
} from "../ports";
import { DEFAULT_SAFETY_BASELINE } from "../policy";

export class SystemSafetyPolicySource implements SafetyPolicySource {
  async fetch(
    _request: ContextRequest,
  ): Promise<ContextSourceResult<SafetyPolicyItem>> {
    const content: SafetyPolicyItem = {
      contentBoundary: DEFAULT_SAFETY_BASELINE.contentBoundary,
      requireParentApprovalForAi:
        DEFAULT_SAFETY_BASELINE.requireParentApprovalForAi,
      forbiddenThemes: [...DEFAULT_SAFETY_BASELINE.forbiddenThemes],
      ageGuidance: [
        "Use age-appropriate language and themes.",
        "Prefer non-graphic, emotionally safe conflict resolution.",
      ],
      rules: [
        "System safety policy cannot be weakened by lower-priority context.",
        "Do not introduce forbidden themes.",
      ],
    };

    return {
      items: [
        {
          id: "system-safety-baseline",
          type: "safety-policy",
          content,
          text: JSON.stringify(content),
          sourceEngine: "context/system-safety-baseline",
          authority: 1,
          confidence: 1,
          scope: "system_policy",
          priority: 1,
          relevance: 1,
        },
      ],
      sourceRelevance: 1,
    };
  }
}

/**
 * Production semantic: no persisted parent-policy authority exists yet.
 * An empty result must never be interpreted as permission to weaken safety.
 */
export class NoPersistedParentPolicySource implements ParentPolicySource {
  async fetch(
    _request: ContextRequest,
  ): Promise<ContextSourceResult<ParentPolicyItem>> {
    return { items: [], sourceRelevance: 0 };
  }
}

/**
 * Production semantic: there is no canonical knowledge/fact authority yet.
 * World state is supplied separately by WorldSource; duplicating it here
 * would waste the bounded context budget and create competing authorities.
 */
export class NoCanonicalKnowledgeSource implements KnowledgeSource {
  async fetch(
    _request: ContextRequest,
  ): Promise<ContextSourceResult<KnowledgeItem>> {
    return { items: [], sourceRelevance: 0 };
  }
}
