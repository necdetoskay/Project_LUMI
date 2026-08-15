import { worldToContextItems } from "../application/world-context-mapper";
import type {
  ContextRequest,
  ContextSourceResult,
  WorldItem,
  WorldSource,
} from "../ports";

export class InMemoryWorldAdapter implements WorldSource {
  constructor(private readonly world: WorldItem) {}

  async fetch(
    _request: ContextRequest,
  ): Promise<ContextSourceResult<WorldItem>> {
    void _request;
    return {
      sourceRelevance: 0.9,
      items: worldToContextItems(this.world, {
        sourceEngine: "world",
        relevance: 0.9,
      }),
    };
  }
}
