import {
  CanonicalMemoryRetrievalAdapter,
  NoCanonicalKnowledgeSource,
  NoPersistedParentPolicySource,
  PersistedEmotionalStateSource,
  RequestSnapshotWorkingStorySource,
  RetrievalLongTermMemorySource,
  RetrievalWorldEventSource,
  SystemSafetyPolicySource,
  WorldEventRetrievalAdapter,
  createStoryGenerationContextComposer,
  type EmotionalStateItem,
  type StoryGenerationContextComposer,
  type WorkingStoryItem,
} from "@lumi/context";
import { DrizzleCanonicalMemoryRepository } from "@lumi/npc-intelligence";
import { DrizzleWorldEventReader, getWorldDb } from "@lumi/world";

export interface StoryContextRuntimeReaders {
  readWorkingStory: (
    request: Parameters<RequestSnapshotWorkingStorySource["fetch"]>[0],
  ) => Promise<WorkingStoryItem | null> | WorkingStoryItem | null;
  readEmotionalState: (
    request: Parameters<PersistedEmotionalStateSource["fetch"]>[0],
  ) => Promise<EmotionalStateItem[]> | EmotionalStateItem[];
}

/**
 * Web production composition root for story-generation context.
 *
 * Persisted authorities are owned by their domain packages. Request/session
 * state remains owned by the caller and is supplied through explicit readers.
 * Missing parent-policy and knowledge authorities have explicit production
 * semantics and must not be replaced with in-memory fixture data.
 */
export function createProductionStoryContextComposer(
  readers: StoryContextRuntimeReaders,
): StoryGenerationContextComposer {
  const memoryRepository = new DrizzleCanonicalMemoryRepository();
  const memoryRetrieval = new CanonicalMemoryRetrievalAdapter(memoryRepository);

  const worldEventReader = new DrizzleWorldEventReader(getWorldDb());
  const worldRetrieval = new WorldEventRetrievalAdapter(worldEventReader);

  return createStoryGenerationContextComposer({
    safetyPolicySource: new SystemSafetyPolicySource(),
    parentPolicySource: new NoPersistedParentPolicySource(),
    workingStorySource: new RequestSnapshotWorkingStorySource(
      readers.readWorkingStory,
    ),
    emotionalStateSource: new PersistedEmotionalStateSource(
      readers.readEmotionalState,
    ),
    longTermMemorySource: new RetrievalLongTermMemorySource(memoryRetrieval),
    knowledgeSource: new NoCanonicalKnowledgeSource(),
    worldSource: new RetrievalWorldEventSource(worldRetrieval),
  });
}
