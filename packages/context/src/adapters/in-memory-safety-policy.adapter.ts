import {
  type ContextRequest,
  type ContextSourceResult,
  type SafetyPolicyItem,
  type SafetyPolicySource,
} from "../ports";
import { safetyPolicyToItem } from "../application";

export class InMemorySafetyPolicyAdapter implements SafetyPolicySource {
  constructor(private readonly policy: SafetyPolicyItem) {}

  async fetch(_request: ContextRequest): Promise<ContextSourceResult<SafetyPolicyItem>> {
    void _request;
    return {
      sourceRelevance: 1,
      items: [safetyPolicyToItem(this.policy)],
    };
  }
}
