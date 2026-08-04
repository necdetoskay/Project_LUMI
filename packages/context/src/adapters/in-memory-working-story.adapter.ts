import {
  type ContextRequest,
  type ContextSourceResult,
  type WorkingStoryItem,
  type WorkingStorySource,
} from "../ports";
import { workingStoryToItems } from "../application";

export class InMemoryWorkingStoryAdapter implements WorkingStorySource {
  constructor(private readonly story: WorkingStoryItem) {}

  async fetch(
    _request: ContextRequest,
  ): Promise<ContextSourceResult<WorkingStoryItem>> {
    void _request;
    return {
      sourceRelevance: 1,
      items: workingStoryToItems(this.story),
    };
  }
}
