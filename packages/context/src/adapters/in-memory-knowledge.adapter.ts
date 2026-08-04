import {
  type ContextRequest,
  type ContextSourceResult,
  type KnowledgeItem,
  type KnowledgeSource,
} from "../ports";
import { knowledgeToItems } from "../application";

export class InMemoryKnowledgeAdapter implements KnowledgeSource {
  constructor(private readonly knowledge: KnowledgeItem) {}

  async fetch(
    _request: ContextRequest,
  ): Promise<ContextSourceResult<KnowledgeItem>> {
    void _request;
    return {
      sourceRelevance: 0.9,
      items: knowledgeToItems(this.knowledge),
    };
  }
}
