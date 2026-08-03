import {
  type ContextRequest,
  type ContextSourceResult,
  type EmotionalStateItem,
  type EmotionalStateSource,
} from "../ports";
import { emotionalStateToItems } from "../application";

export class InMemoryEmotionalStateAdapter implements EmotionalStateSource {
  constructor(private readonly states: EmotionalStateItem[]) {}

  async fetch(_request: ContextRequest): Promise<ContextSourceResult<EmotionalStateItem>> {
    void _request;
    return {
      sourceRelevance: 0.9,
      items: this.states.flatMap(emotionalStateToItems),
    };
  }
}
