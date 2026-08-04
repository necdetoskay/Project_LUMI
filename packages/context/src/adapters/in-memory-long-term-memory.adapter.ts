import {
  type ContextRequest,
  type ContextSourceResult,
  type LongTermMemoryItem,
  type LongTermMemorySource,
} from "../ports";
import { longTermMemoryToItems } from "../application";

export class InMemoryLongTermMemoryAdapter implements LongTermMemorySource {
  constructor(private readonly memories: LongTermMemoryItem[]) {}

  async fetch(
    _request: ContextRequest,
  ): Promise<ContextSourceResult<LongTermMemoryItem>> {
    void _request;
    return {
      sourceRelevance: 0.85,
      items: this.memories.flatMap(longTermMemoryToItems),
    };
  }
}
