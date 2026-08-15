import { emotionalStateToItems, workingStoryToItems } from "../application";
import type {
  ContextRequest,
  ContextSourceResult,
  EmotionalStateItem,
  EmotionalStateSource,
  WorkingStoryItem,
  WorkingStorySource,
} from "../ports";

export type WorkingStorySnapshotReader = (
  request: ContextRequest,
) => Promise<WorkingStoryItem | null> | WorkingStoryItem | null;

export type EmotionalStateSnapshotReader = (
  request: ContextRequest,
) => Promise<EmotionalStateItem[]> | EmotionalStateItem[];

/**
 * Production adapter over the canonical generation/session snapshot supplied
 * by the application composition root. It never manufactures story state.
 */
export class RequestSnapshotWorkingStorySource implements WorkingStorySource {
  constructor(private readonly read: WorkingStorySnapshotReader) {}

  async fetch(
    request: ContextRequest,
  ): Promise<ContextSourceResult<WorkingStoryItem>> {
    const story = await this.read(request);
    if (!story) return { items: [], sourceRelevance: 0 };

    return {
      items: workingStoryToItems(story),
      sourceRelevance: 1,
    };
  }
}

/**
 * Production adapter whose reader is provided by the application layer and is
 * expected to resolve persisted character-domain state under household scope.
 */
export class PersistedEmotionalStateSource implements EmotionalStateSource {
  constructor(private readonly read: EmotionalStateSnapshotReader) {}

  async fetch(
    request: ContextRequest,
  ): Promise<ContextSourceResult<EmotionalStateItem>> {
    const states = await this.read(request);
    if (states.length === 0) return { items: [], sourceRelevance: 0 };

    return {
      items: states.flatMap(emotionalStateToItems),
      sourceRelevance: 0.9,
    };
  }
}
