import {
  type ContextRequest,
  type ContextSourceResult,
  type WorldItem,
  type WorldSource,
} from "../ports";
import { worldToItems } from "../application";

export class InMemoryWorldAdapter implements WorldSource {
  constructor(private readonly world: WorldItem) {}

  async fetch(
    _request: ContextRequest,
  ): Promise<ContextSourceResult<WorldItem>> {
    void _request;
    return {
      sourceRelevance: 0.9,
      items: worldToItems(this.world),
    };
  }
}
